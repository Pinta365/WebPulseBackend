/**
 * WebPulseBackend Database Migration
 */

export const databaseVersion = "X.Y.Z-tag.revision";
export const changeLog = [
    "Set db_version to X.Y.Z-tag.revision",
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
