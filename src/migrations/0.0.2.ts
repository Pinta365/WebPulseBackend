/**
 * WebPulseBackend Database Migration
 */

import { LoggerData } from "../db.ts";

export const databaseVersion = "0.0.2";
export const changeLog = [
    "Add indexes [projectId, type, timestamp] and [payloadId, timestamp] to old entries",
];

export interface OldLoggerData {
    type: string;
    payload: {
        [key: string]: string | number;
    };
}

export async function migration(database: Deno.Kv) {
    try {
        // ... do migration
        await Promise.all([]);

        // Convert indices written during the [ts, projectId, ...]-era
        const all3 = database.list({start: [0], end: [Infinity]});
        for await (const entry of all3) {
            // Old entry
            if (entry.value && Object.prototype.hasOwnProperty.call(entry.value,"payload") && Object.prototype.hasOwnProperty.call(entry.value,"type")) {
                const loggerData = entry.value as OldLoggerData;
                const converted: LoggerData = {
                    ...(loggerData.payload as LoggerData)
                };
                if (!converted.type) converted.type = loggerData.type;
                // Ensure all indices
                await database.set([converted.projectId, converted.timestamp], converted);
                await database.set([converted.projectId, loggerData.type, converted.timestamp], converted);
                await database.set([converted.payloadId as string], converted);
            // Newer entry
            } else if (Object.prototype.hasOwnProperty.call(entry.value,"type")) {
                const loggerData = entry.value as LoggerData;

                // Ensure all indices
                await database.set([loggerData.projectId, loggerData.timestamp], loggerData);
                await database.set([loggerData.projectId, loggerData.type, loggerData.timestamp], loggerData);
                await database.set([loggerData.payloadId as string], loggerData);

            }

        }

        // Convert indices written during the old era
        const all4 = database.list({start: ["0"], end: ["Z"]});
        for await (const entry of all4) {
            if (entry.value && Object.prototype.hasOwnProperty.call(entry.value,"type")) {
                const loggerData = entry.value as LoggerData;
                
                // Ensure all indices
                await database.set([loggerData.projectId, loggerData.timestamp], loggerData);
                await database.set([loggerData.projectId, loggerData.type, loggerData.timestamp], loggerData);
                await database.set([loggerData.payloadId as string], loggerData);

            }
        }

        // Done, set version and return true!
        database.set(["db_version"], databaseVersion);
        return true;
    } catch (e) {
        // Ouch
        console.log(`Database migration failed catastrophically: ${e}`);
        return false;
    }
}
