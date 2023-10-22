import { logError } from "./debug_logger.ts";
import { config } from "./config.ts";
import { semver } from "../deps.ts";
import { resolve } from "../deps.ts";
import { genULID } from "./helpers.ts";

let database: Deno.Kv | null = null; // Prevents the db from connecting when using other loggers.

// Update this on any database change, then copy /migrations.template.ts to migrations/<version>.ts to address the changes
const CURRENT_DATABASE_VERSION = "0.0.2"
const REQUIRED_DATABASE_VERSION = semver.parse(CURRENT_DATABASE_VERSION) as semver.SemVer;

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

        // Get current database version, default to CURRENT_DATABASE_VERSION
        let versionString = CURRENT_DATABASE_VERSION;
        if (info.value === null) {
            console.log(`Database version did not exist, initializing to '${versionString}'.`);
            await database.set(['db_version'], versionString);
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
            const relativeFilePath = `${new URL('.', import.meta.url).pathname}migrations/${name}`;
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
        console.log(`Applying database migration version '${migration.version}'`);
        for (const change of migration.changeLog) {
            console.log(` - ${change}`);
        }
        await migration.migration(database);
    }
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
    ownerId: string;
    name: string;
    description?: string;
    allowedOrigins?: string[];
    options: ProjectOptions;
}

export interface LoggerData {
    // Fixed types    
    timestamp: number;
    projectId: string;
    type: string;
    pageLoadId: string;
    sessionId: string;    
    // eventtype specific types.. should be typed at some point
    [key: string]: string | number | undefined;
};

async function writeIndexes(payload: LoggerData) {
    if (!database) {
        database = await getDatabase();
    }

    await database.set([payload.projectId, payload.timestamp], payload);

    // Added in db version 0.0.2
    await database.set([payload.projectId, payload.type, payload.timestamp], payload);
    await database.set([payload.payloadId as string], payload);
}

async function writeOrUpdateSession(payload: LoggerData) {
    const sessionEvent = await getEventById(payload.sessionId);

    if (sessionEvent && sessionEvent.type === "pageSession") {
        sessionEvent.lastEventAt = payload.timestamp;
        await writeIndexes(sessionEvent);
        
    } else {
        const sessionData = {
            type: "pageSession",
            projectId: payload.projectId,
            sessionId: payload.sessionId,
            pageLoadId: payload.pageLoadId,
            payloadId: payload.sessionId,
            timestamp: payload.timestamp,
            firstEventAt: payload.timestamp,
            lastEventAt: payload.timestamp,        
            // lite okalrt vad jag ska spara på session..
        }

        if (payload.userAgent) {
            sessionData.userAgent = payload.userAgent
        }
        console.log(sessionData);
        await writeIndexes(sessionData);
    }
}

async function writeOrUpdatePageLoad(payload: LoggerData) {
    const pageLoadEvent = await getEventById(payload.pageLoadId);
    if (pageLoadEvent && pageLoadEvent.type === "pageLoad") {
        pageLoadEvent.lastEventAt = payload.timestamp;
        await writeIndexes(pageLoadEvent);
        
    }else {
        payload.payloadId = payload.pageLoadId;
        await writeIndexes(payload);
    }
}

export async function insertEvent(payload: LoggerData) {
    try {
        if (!database) {
            database = await getDatabase();
        }

        // Unikt id för varje event
        payload.payloadId = genULID();

        // Uppdatera loads och sessions med lastEventAt
        await writeOrUpdatePageLoad(payload);
        await writeOrUpdateSession(payload);
        
        // skjut in vanliga payloaden.. hmm om den alltid ska skrivas
        await writeIndexes(payload);

    } catch (error) {
        logError("Error writing event", error);
    }
}

export async function getEventById(payloadId: string): Promise<LoggerData> {
    if (!database) {
        database = await getDatabase();
    }

    const project = await database.get([payloadId]);
    return project.value as LoggerData;
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

export async function getProjectConfiguration(
    projectId: string,
    origin: string,
): Promise<false | Project> {
    const project = (await getProjects()).find((item) => item.id === projectId);
    if (!project) {
        return false;
    }
    const configuration: Project = project;

    /*
    const allowedOrigins = configuration.allowedOrigins
        ? configuration.allowedOrigins : [];

    if (config.serverMode === "production" && !allowedOrigins.includes(origin)) {
        return false;
    }*/
    

    return configuration;
}
