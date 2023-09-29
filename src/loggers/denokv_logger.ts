import { Logger, LoggerData } from "../logger_manager.ts";
const database = await Deno.openKv();

interface ClientEvent {
    type: string;
    realmId: string;
    projectId: string;
    deviceId: string;
    sessionId: string;
}

interface SessionMeta extends ClientEvent {
    firstEvent: number;
    lastEvent: number;

    /* more data.. user agent etc?? */
}

interface PageLoad extends ClientEvent {
    url: string;
    timestamp: number;

    /* more data.. page title.. hmm meta tags??*/
}

interface PageClick extends ClientEvent {
    targetTag?: string;
    targetId?: string;
    targetHref?: string;
    x: number;
    y: number;
    timestamp: number;

    /* more data.. page title.. hmm meta tags??*/
}

interface PageScroll extends ClientEvent {
    depth: number;
    timestamp: number;

    /* more data.. page title.. hmm meta tags??*/
}

async function insertPageLoad(payload: PageLoad) {
    try {
        await database.set([payload.timestamp, payload.realmId, payload.projectId, payload.type], payload);
        await database.set([payload.realmId, payload.timestamp, payload.projectId, payload.type], payload);                
    } catch (error) {
        console.error("Error writing PageLoad", error);
    }
}

async function insertPageClick(payload: PageClick) {
    try {
        await database.set([payload.timestamp, payload.realmId, payload.projectId, payload.type], payload);
        await database.set([payload.realmId, payload.timestamp, payload.projectId, payload.type], payload);
    } catch (error) {
        console.error("Error writing PageLoad", error);
    }
}

async function insertPageScroll(payload: PageScroll) {
    try {
        await database.set([payload.timestamp, payload.realmId, payload.projectId, payload.type], payload);
        await database.set([payload.realmId, payload.timestamp, payload.projectId, payload.type], payload);
    } catch (error) {
        console.error("Error writing PageLoad", error);
    }
}

export class denokvLogger implements Logger {
    async log(data: LoggerData): Promise<void> {
        if (data.type === "pageLoad") {
            const payload: PageLoad = data.payload as unknown as PageLoad; //Ugly type conversion needs to be fixed :P
            await insertPageLoad(payload);
        } else if (data.type === "pageClick") {
            const payload: PageClick = data.payload as unknown as PageClick;
            await insertPageClick(payload);
        } else if (data.type === "pageScroll") {
            const payload: PageScroll = data.payload as unknown as PageScroll;
            await insertPageScroll(payload);
        } else {
            console.warn("Type not implemented");
        }
    }
}
