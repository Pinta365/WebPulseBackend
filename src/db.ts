
import { MongoClient, Db, ObjectId } from 'npm:mongodb';
import { logError } from "./debug_logger.ts";
import { config } from "./config.ts";
import { semver } from "../deps.ts";
import { resolve } from "../deps.ts";

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
    _id?: ObjectId; //skapas is DBn
    id: string;
    ownerId: string;
    name: string;
    description?: string;
    allowedOrigins?: string[];
    options: ProjectOptions;
}

const mongoClient = new MongoClient(config.MongoUri!);
let mongoDatebase: Db | null = null; // 

export async function getDatabase(): Promise<Db> {
    if (!mongoDatebase) {
        await mongoClient.connect();
        mongoDatebase = mongoClient.db("WebPulse");
        console.log("Connected to MongoDB");
    }
    //await checkMigrations();
    return mongoDatebase;
}
export async function disconnect(): Promise<void> {
    await mongoClient.close();
    mongoDatebase = null;
    console.log("MongoDB connection closed.");
}

/*

// Update this on any database change, then copy /migrations.template.ts to migrations/<version>.ts to address the changes
const CURRENT_DATABASE_VERSION = "0.0.2";
const REQUIRED_DATABASE_VERSION = semver.parse(CURRENT_DATABASE_VERSION) as semver.SemVer;



async function checkMigrations() {
    if (database) {
        const info: Deno.KvEntryMaybe<string> = await database.get(["db_version"]);

        // Get current database version, default to CURRENT_DATABASE_VERSION
        let versionString = CURRENT_DATABASE_VERSION;
        if (info.value === null) {
            console.log(`Database version did not exist, initializing to '${versionString}'.`);
            await database.set(["db_version"], versionString);
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
            await applyMigrations(version);
        }

        // All good!
    } else {
        throw new Error("This should not happen on database inititalization.");
    }
}

async function applyMigrations(currentVersion: semver.SemVer) {
    const migrationsFolder = resolve("src/migrations");

    // Load migrations
    let migrations = [];
    for await (const { isFile, name } of Deno.readDir(migrationsFolder)) {
        if (isFile && name.endsWith(".ts") && name !== "template.ts") {
            const relativeFilePath = `${new URL(".", import.meta.url).pathname}migrations/${name}`;
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
        console.log(`Applying database migration version '${semver.format(migration.version)}'`);
        for (const change of migration.changeLog) {
            console.log(` - ${change}`);
        }
        await migration.migration(database);
    }
}
*/

export interface EventPayload {
    // Fixed types
    timestamp: number;
    projectId: string;
    type: string;
    pageLoadId: string;
    sessionId: string;
    // eventtype specific types.. should be typed at some point
    [key: string]: string | number | undefined;
}


export async function insertEvent(payload: EventPayload) {
    try {
        try {
            const collection = (await getDatabase()).collection('events');
            const insertedId = (await collection.insertOne(payload)).insertedId.toString();
            console.log(payload.type, insertedId);

            if (payload.type === "pageLoad") {
                const sessionData: EventPayload = {
                    type: "pageSession",
                    projectId: payload.projectId,
                    sessionId: payload.sessionId,
                    pageLoadId: payload.pageLoadId,
                    timestamp: payload.timestamp,
                    firstEventAt: payload.timestamp,
                    lastEventAt: payload.timestamp,
                };
    
                if (payload.userAgent) {
                    sessionData.userAgent = payload.userAgent;
                }

                const insertedSessionId = (await collection.insertOne(sessionData)).insertedId.toString();
                console.log(sessionData.type, insertedSessionId);
            }          
           
        } catch (error) {
        console.error(error);
        throw new Error(error);
    }


} catch (error) {
    logError("Error writing event", error);
}
}

export async function getEvents(projectId: string): Promise<EventPayload[]> {
    try {
        const collection = (await getDatabase()).collection('events');
        const events = await collection.find({ projectId }).toArray() as unknown as EventPayload[];



        return events;

    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
}

export async function getProject(projectId: string): Promise<Project> {
    try {
        const collection = (await getDatabase()).collection('projects');
        const idObject = new ObjectId(projectId);
        const project = await collection.findOne({ _id: idObject }) as unknown as Project;
        project.id = projectId;



        return project;

    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
}

export async function getProjects(): Promise<Project[]> {
    try {
        const collection = (await getDatabase()).collection('projects');
        const projects = await collection.find({}).toArray() as unknown as Project[];



        projects.forEach(project => {
            const idObject = new ObjectId(project._id);
            project.id = idObject.toString();
        });

        return projects;

    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
}

export async function insertProject(project: Project): Promise<string> {
    try {
        const collection = (await getDatabase()).collection('projects');
        const projectReturned = await collection.insertOne(project);



        return projectReturned.insertedId.toString();

    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
}

export async function getProjectConfiguration(
    projectId: string,
    origin: string,
): Promise<false | Project> {
    const project = await getProject(projectId);
    
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

