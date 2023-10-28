/**
 * WebPulseBackend Database Migration
 */
import { Db, setDatabaseVersion } from "../db.ts";

export const databaseVersion = "0.0.1";
export const changeLog = [
    "Set db_version to 0.0.1",
];

export async function migration(database: Db) {
    try {
        // ... do migration
        await Promise.all([]);

        console.log(`Migration to ${databaseVersion} ran`);

        // Done, set version and return true!
        setDatabaseVersion(databaseVersion);
        return true;
    } catch (e) {
        // Ouch
        console.log(`Database migration failed catastrophically: ${e}`);
        return false;
    }
}
