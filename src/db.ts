import { Db, MongoClient, ObjectId } from "../deps.ts";
import { logError } from "./debug_logger.ts";
import { config } from "./config.ts";
import { semver } from "../deps.ts";
import { resolve } from "../deps.ts";

import type { Browser, Cpu, Device, Engine, Os } from "../deps.ts";

export { ObjectId } from "../deps.ts";
export type { Db } from "../deps.ts";

// Update this on any database change, then copy /migrations.template.ts to migrations/<version>.ts to address the changes
const CURRENT_DATABASE_VERSION = "0.0.2";
const REQUIRED_DATABASE_VERSION = semver.parse(CURRENT_DATABASE_VERSION) as semver.SemVer;

const mongoClient = new MongoClient(config.MongoUri!);
let mongoDatabase: Db | null = null; //

export async function getDatabase(): Promise<Db> {
    if (!mongoDatabase) {
        await mongoClient.connect();
        mongoDatabase = mongoClient.db("WebPulse");
        console.log("Connected to MongoDB");
    }

    if (config.runMigrations) {
        await checkMigrations();
    }

    return mongoDatabase;
}

export async function disconnect(): Promise<void> {
    await mongoClient.close();
    mongoDatabase = null;
    console.log("MongoDB connection closed.");
}

export interface DbVersionDocument {
    _id: ObjectId;
    key: string;
    value: string;
}

//Get current database version, default to CURRENT_DATABASE_VERSION
async function getDatabaseVersion(): Promise<string> {
    try {
        if (!mongoDatabase) {
            await mongoClient.connect();
            mongoDatabase = mongoClient.db("WebPulse");
            console.log("Connected to MongoDB");
        }
        const collection = mongoDatabase.collection("server_info");
        const versionDoc = await collection.findOne({ key: "db_version" }) as DbVersionDocument;

        if (!versionDoc) {
            setDatabaseVersion(CURRENT_DATABASE_VERSION);
            return CURRENT_DATABASE_VERSION;
        }

        return versionDoc.value;
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
}

export async function setDatabaseVersion(newVersion: string): Promise<boolean> {
    try {
        if (!mongoDatabase) {
            await mongoClient.connect();
            mongoDatabase = mongoClient.db("WebPulse");
            console.log("Connected to MongoDB");
        }

        const collection = mongoDatabase.collection("server_info");

        const result = await collection.updateOne(
            { key: "db_version" },
            { $set: { value: newVersion } },
            { upsert: true },
        );

        return (result.modifiedCount > 0);
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
}

async function checkMigrations() {
    const versionString = await getDatabaseVersion();

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
        await migration.migration(mongoDatabase);
    }
}

export interface ProjectOptions {
    storeUserAgent: boolean;
    storeLocation: boolean;
    pageLoads: {
        enabled: boolean;
    };
    pageClicks: {
        enabled: boolean;
        captureAllClicks: boolean;
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

export interface EventPayload {
    // Fixed types
    timestamp: number;
    projectId: ObjectId;
    type: string;
    pageLoadId: ObjectId;
    deviceId: ObjectId;
    sessionId: ObjectId;
    userAgent?: UserAgentData;
    location?: LocationData;
    // eventtype specific types.. should be typed at some point
    [key: string]: string | number | undefined | ObjectId | LocationData | UserAgentData;
}

export interface UserAgentData {
    browser: Browser;
    cpu: Cpu;
    device: Device;
    engine: Engine;
    os: Os;
    ua: string;
}
export interface LocationData {
    countryShort: string;
    countryLong: string;
}

interface PageLoad {
    pageLoadId: ObjectId;
    timestamp: number;
    firstEventAt: number;
    lastEventAt: number;

    clicks: number;
    scrolls: number;
}

interface SessionObject {
    _id: ObjectId;
    projectId: ObjectId;
    deviceId: ObjectId;
    timestamp: number;
    firstEventAt: number;
    lastEventAt: number;
    userAgent?: UserAgentData;
    location?: LocationData;

    loads: number;
    clicks: number;
    scrolls: number;

    pageLoads: PageLoad[];
}

interface DeviceObject {
    _id: ObjectId;
    projectId: ObjectId;
    firstEventAt: number;
    lastEventAt: number;
    sessionIds: ObjectId[];

    sessions: number;
    loads: number;
    clicks: number;
    scrolls: number;
}

type IncrementData = {
    "pageLoads.$.clicks"?: number;
    "pageLoads.$.scrolls"?: number;
};

async function handleSessionLogic(payload: EventPayload) {
    const db = await getDatabase();
    const sessionCollection = db.collection("sessions");

    const session = await sessionCollection.findOne({ _id: payload.sessionId }) as SessionObject | null;
    const isClickEvent = payload.type === "pageClick";
    const isScrollEvent = payload.type === "pageScroll";
    const isLoadEvent = payload.type === "pageLoad";
    const isInitEvent = payload.type === "pageInit";
    const isHideEvent = payload.type === "pageHide";

    const newPageLoad = {
        pageLoadId: payload.pageLoadId,
        url: payload.url,
        title: payload.title,
        referer: payload.referrer,
        timestamp: payload.timestamp,
        firstEventAt: payload.timestamp,
        lastEventAt: payload.timestamp,
        clicks: isClickEvent ? 1 : 0,
        scrolls: isScrollEvent ? 1 : 0,
    };

    if (session) {
        const existingPageLoad = session.pageLoads.find((pageLoad) =>
            pageLoad.pageLoadId.toString() === payload.pageLoadId.toString()
        );

        if (existingPageLoad) {
            const incrementData: IncrementData = {};

            if (isClickEvent) {
                incrementData["pageLoads.$.clicks"] = 1;
                session.clicks += 1;
            }

            if (isScrollEvent) {
                incrementData["pageLoads.$.scrolls"] = 1;
                session.scrolls += 1;
            }

            await sessionCollection.updateOne(
                { _id: payload.sessionId, "pageLoads.pageLoadId": payload.pageLoadId },
                {
                    $inc: incrementData,
                    $set: { "pageLoads.$.lastEventAt": payload.timestamp },
                },
            );
        } else {
            if (!isInitEvent && !isHideEvent) {
                session.loads += 1;
                await sessionCollection.updateOne({ _id: payload.sessionId }, { $push: { pageLoads: newPageLoad } });
            }
        }
        await sessionCollection.updateOne({ _id: payload.sessionId }, {
            $set: {
                lastEventAt: payload.timestamp,
                clicks: session.clicks,
                scrolls: session.scrolls,
                loads: session.loads,
            },
        });
    } else {
        const sessionData: SessionObject = {
            _id: payload.sessionId,
            projectId: payload.projectId,
            deviceId: payload.deviceId,
            timestamp: payload.timestamp,
            firstEventAt: payload.timestamp,
            lastEventAt: payload.timestamp,
            loads: isLoadEvent ? 1 : 0,
            clicks: isClickEvent ? 1 : 0,
            scrolls: isScrollEvent ? 1 : 0,
            pageLoads: (isInitEvent || isHideEvent ? [] : [newPageLoad]),
        };

        if (payload.userAgent) {
            sessionData.userAgent = payload.userAgent;
        }
        if (payload.location) {
            sessionData.location = payload.location;
        }
        await sessionCollection.insertOne(sessionData);
    }
}

async function handleDeviceLogic(payload: EventPayload) {
    const db = await getDatabase();
    const deviceCollection = db.collection("devices");

    const device = await deviceCollection.findOne({ _id: payload.deviceId }) as DeviceObject | null;

    const isClickEvent = payload.type === "pageClick";
    const isScrollEvent = payload.type === "pageScroll";
    const isLoadEvent = payload.type === "pageLoad";

    if (device) {
        const isExistingSession = device.sessionIds.find((sess) => sess.toString() === payload.sessionId.toString());
        const incrementData = {
            sessions: isExistingSession ? 0 : 1,
            loads: isLoadEvent ? 1 : 0,
            clicks: isClickEvent ? 1 : 0,
            scrolls: isScrollEvent ? 1 : 0,
        };

        await deviceCollection.updateOne(
            { _id: payload.deviceId },
            {
                $addToSet: { sessionIds: payload.sessionId },
                $set: { lastEventAt: payload.timestamp },
                $inc: incrementData,
            },
        );
    } else {
        // Create new device entry
        const newDevice: DeviceObject = {
            _id: payload.deviceId,
            projectId: payload.projectId,
            firstEventAt: payload.timestamp,
            lastEventAt: payload.timestamp,
            sessionIds: [payload.sessionId],
            sessions: 1,
            loads: isLoadEvent ? 1 : 0,
            clicks: isClickEvent ? 1 : 0,
            scrolls: isScrollEvent ? 1 : 0,
        };
        await deviceCollection.insertOne(newDevice);
    }
}

export async function insertEvent(payload: EventPayload) {
    try {
        const db = await getDatabase();

        payload.pageLoadId = new ObjectId(payload.pageLoadId);
        payload.sessionId = new ObjectId(payload.sessionId);
        payload.deviceId = new ObjectId(payload.deviceId);
        payload.projectId = new ObjectId(payload.projectId);

        // Create or update the session and device collection a long with counters.
        await handleSessionLogic(payload);
        await handleDeviceLogic(payload);

        // Insert the "raw" event into the events collection after some cleaning.
        //delete payload.userAgent;
        //delete payload.location;
        const collection = db.collection("events");
        await collection.insertOne(payload);
    } catch (error) {
        logError("Error writing event", error);
        logError("Payload =", payload);
    }
}

export async function getEvents(projectId: string): Promise<EventPayload[]> {
    try {
        const collection = (await getDatabase()).collection("events");
        const events = await collection.find({ projectId }).toArray() as unknown as EventPayload[];

        return events;
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
}

export async function getProject(projectId: string): Promise<Project | null> {
    try {
        const collection = (await getDatabase()).collection("projects");
        const idObject = new ObjectId(projectId);
        const project = await collection.findOne({ _id: idObject }) as unknown as Project;

        return project;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function getProjects(): Promise<Project[] | null> {
    try {
        const collection = (await getDatabase()).collection("projects");
        const projects = await collection.find({}).toArray() as unknown as Project[];

        return projects;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function insertProject(project: Project): Promise<string> {
    try {
        const collection = (await getDatabase()).collection("projects");
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

    const allowedOrigins = (configuration.allowedOrigins && configuration.allowedOrigins.length > 0)
        ? configuration.allowedOrigins
        : undefined;

    if (allowedOrigins && config.serverMode === "production" && !allowedOrigins.includes(origin)) {
        console.log("debug: Origin not allowed.", allowedOrigins, "-", origin);
        return false;
    }

    return configuration;
}
