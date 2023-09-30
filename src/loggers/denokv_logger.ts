import { Logger, LoggerData } from "../logger_manager.ts";
let database: Deno.Kv | null = null; // Prevents the db from connecting when using other loggers.

// Should parse and type the data better than "LoggerData["payload"]"

async function insertEvent(payload: LoggerData["payload"]) {
    try {
        
        if (!database) {
            database = await Deno.openKv(Deno.env.get("DENO_KV_LOCAL_DATABASE") || undefined);
        }

        await database.set([payload.timestamp, payload.realmId, payload.projectId, payload.type], payload); 
        // More indexes..      
    } catch (error) {
        console.error("Error writing event", error);
    }
}

export class denokvLogger implements Logger {
    async log(data: LoggerData): Promise<void> {
        const {payload} = data;
        console.log(payload.type);
        await insertEvent(payload);
    }
}
