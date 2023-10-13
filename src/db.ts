import { logError } from "./debug_logger.ts";
import { config } from "./config.ts";
let database: Deno.Kv | null = null; // Prevents the db from connecting when using other loggers.

async function getDatabase() {
    if (config.serverMode === "production") {
        return await Deno.openKv();
    } else {
        return await Deno.openKv(Deno.env.get("DENO_KV_LOCAL_DATABASE") || undefined);
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
