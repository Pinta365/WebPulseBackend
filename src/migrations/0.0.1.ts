/**
 * WebPulseBackend Database Migration
 */

export const databaseVersion = "0.0.1";
export const changeLog = [
    "Set db_version to 0.0.1",
];

export async function migration(database: Deno.Kv) {
    try {
        // ... do migration
        await Promise.all([]);

        // Done, set version and return true!
        database.set(["db_version"], databaseVersion);
        return true;
    } catch (e) {
        // Ouch
        console.log(`Database migration failed catastrophically: ${e}`);
        return false;
    }
}
