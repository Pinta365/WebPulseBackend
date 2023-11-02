/**
 * WebPulseBackend Database Migration
 */
import { Db, setDatabaseVersion } from "../db.ts";

export const databaseVersion = "X.Y.Z-tag.revision";
export const changeLog = [
    "Set db_version to X.Y.Z-tag.revision",
];

export async function migration(_database: Db) {
    try {
        // ... do migration
        await Promise.all([]);

        // Done, set version and return true!
        setDatabaseVersion(databaseVersion);
        return true;
    } catch (e) {
        // Ouch
        console.log(`Database migration failed catastrophically: ${e}`);
        return false;
    }
}
