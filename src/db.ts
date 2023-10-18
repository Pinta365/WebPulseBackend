import { logError } from "./debug_logger.ts";
import { config } from "./config.ts";
import { semver } from "../deps.ts";
import { resolve } from "../deps.ts";

let database: Deno.Kv | null = null; // Prevents the db from connecting when using other loggers.

// Update this on any database change, then copy /migrations.template.ts to migrations/<version>.ts to address the changes
const REQUIRED_DATABASE_VERSION = semver.parse("0.0.1") as semver.SemVer;

export async function getDatabase() {
    // Ignore DENO_KV_LOCAL_DATABASE in production
    const connectionString = config.serverMode !== "production"
        ? Deno.env.get("DENO_KV_LOCAL_DATABASE") || undefined
        : undefined;
    database = await Deno.openKv(connectionString);
    await checkMigrations();
    return database;
}

async function checkMigrations() {
    if (database) {
        const info: Deno.KvEntryMaybe<string> = await database.get(["db_version"]);

        // Get current database version, default to 0.0.0
        let versionString = "0.0.0";
        if (info.value === null) {
            console.log(`Database version did not exist, initializing to '${versionString}'.`);
            //await database.set(['db_version'], versionString);
        } else {
            versionString = info.value as string;
        }

        // Compare application version with db version
        const version = semver.parse(versionString);
        if (version === null) {
            throw new Error("Could not parse current database version.");
        }
        if (semver.lt(version, REQUIRED_DATABASE_VERSION)) {
            console.log("Checking for migrations");
            // New version, check for migrations and apply them in correct order
            await applyMigrations(version, REQUIRED_DATABASE_VERSION);
        }

        // All good!
    } else {
        throw new Error("This should not happen on database inititalization.");
    }
}

async function applyMigrations(currentVersion: semver.SemVer, requiredVersion: semver.SemVer) {
    const migrationsFolder = resolve("src/migrations");

    // Load migrations
    let migrations = [];
    for await (const { isFile, name } of Deno.readDir(migrationsFolder)) {
        if (isFile && name.endsWith(".ts") && name !== "template.ts") {
            const relativeFilePath = `./migrations/${name}`;
            const migration = await import(relativeFilePath);
            migrations.push({
                version: semver.parse(migration.databaseVersion),
                changeLog: migration.changeLog,
                migration: migration.migration,
            });
        }
    }

    // Filter applicable migrations
    migrations = migrations.filter((m) => semver.gt(m.version as semver.SemVer, currentVersion));

    // Sort migrations by semver
    migrations = migrations.sort((a, b) => semver.lt(b.version as semver.SemVer, a.version as semver.SemVer) ? 1 : -1);

    // Apply migrations in order
    for (const migration of migrations) {
        console.log(`Applying database migration version '${migration.version}`);
        for (const change of migration.changeLog) {
            console.log(` - ${change}`);
        }
        await migration.migration(database);
    }
}

export interface LoggerData {
    type: string;
    payload: {
        [key: string]: string | number;
    };
}

export interface Realm {
    id: string;
    //ownerId: string;
    name: string;
    description?: string;
    allowedOrigins?: string[];
}

export interface ProjectOptions {
    pageLoads: {
        enabled: boolean;
        storeUserAgent: boolean;
    };
    pageClicks: {
        enabled: boolean;
        capureAllClicks: boolean;
    };
    pageScrolls: {
        enabled: boolean;
    };
}

export interface Project {
    id: string;
    realmId: string;
    //ownerId: string;
    name: string;
    description?: string;
    allowedOrigins?: string[];
    options?: ProjectOptions;
}

export interface ProjectConfiguration {
    realm: Realm;
    project: Project;
}

// Should parse and type the data better than "LoggerData["payload"]"
async function insertEvent(payload: LoggerData["payload"]) {
    try {
        if (!database) {
            database = await getDatabase();
        }

        await database.set([payload.projectId, payload.timestamp], payload);
        // More indexes..
    } catch (error) {
        logError("Error writing event", error);
    }
}

/**
 * Logs the provided analytic data.
 *
 * @param data - The analytic data to be logged.
 */
export async function logData(data: LoggerData): Promise<void> {
    const { payload } = data;
    await insertEvent(payload);
}

export async function getRealms(): Promise<Realm[]> {
    if (!database) {
        database = await getDatabase();
    }
    const realmList = database.list({ prefix: ["realms"] });
    const realms: Realm[] = [];
    for await (const realm of realmList) {
        realms.push(realm.value as Realm);
    }

    return realms;
}

export async function getProjects(): Promise<Project[]> {
    if (!database) {
        database = await getDatabase();
    }
    const projectList = database.list({ prefix: ["projects"] });
    const projects: Project[] = [];
    for await (const project of projectList) {
        projects.push(project.value as Project);
    }

    return projects;
}

export async function insertProject(project: Project): Promise<boolean> {
    try {
        if (!database) {
            database = await getDatabase();
        }
        await database.set(["projects", project.id], project);
        return true;
    } catch (error) {
        logError("Error writing project", error);
        return false;
    }
}

export async function insertRealm(realm: Realm): Promise<boolean> {
    try {
        if (!database) {
            database = await getDatabase();
        }
        await database.set(["realms", realm.id], realm);
        return true;
    } catch (error) {
        logError("Error writing realms", error);
        return false;
    }
}

export async function getProjectConfiguration(
    projectId: string,
    origin: string,
): Promise<false | ProjectConfiguration> {
    const project = (await getProjects()).find((item) => item.id === projectId);
    if (!project) {
        return false;
    }
    const realm = (await getRealms()).find((item) => item.id === project.realmId);

    if (!realm) {
        return false;
    }
    const configuration: ProjectConfiguration = { realm, project };

    /*
    const allowedOrigins = configuration.project.allowedOrigins
        ? configuration.project.allowedOrigins
        : configuration.realm.allowedOrigins
        ? configuration.realm.allowedOrigins
        : [];

    if (config.serverMode === "production" && !allowedOrigins.includes(origin)) {
        return false;
    }
    */

    return configuration;
}
