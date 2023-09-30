import { Logger, LoggerData } from "../logger_manager.ts";
const database = await Deno.openKv();

// Should parse and type the data better.

async function insertEvent(payload: LoggerData["payload"]) {
    try {
        await database.set([payload.timestamp, payload.realmId, payload.projectId, payload.type], payload); 
        // More indexes..      
    } catch (error) {
        console.error("Error writing event", error);
    }
}

export class denokvLogger implements Logger {
    async log(data: LoggerData): Promise<void> {

        const {payload} = data;
        await insertEvent(payload);

    }
}
