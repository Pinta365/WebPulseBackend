/**
 * WebPulseBackend Database Migration
 */

export const databaseVersion = "0.0.2";
export const changeLog = [
    "Add indexes [projectId, type, timestamp] and [payloadId, timestamp] to old entries",
];

export async function migration(database: Deno.Kv) {
    try {
        // ... do migration
        await Promise.all([]);

        // Convert indices written during the [ts, projectId, ...]-era
        const all3 = database.list({start: [0], end: [Infinity]});
        for await (const entry of all3) {
            if (entry.value && Object.prototype.hasOwnProperty.call(entry.value,"type")) {
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
