/**
 * WebPulseBackend Database Migration
 */
import { Db, setDatabaseVersion } from "../db.ts";

export const databaseVersion = "0.0.3";
export const changeLog = [
    "Add storeUTM property to ProjectOptions for all projects, defaulting to false if not set.",
];

export async function migration(database: Db) {
    try {
        const collection = database.collection("projects");
        const projects = await collection.find({}).toArray();

        for (const proj of projects) {
            if (proj.options && proj.options.storeUTM === undefined) {
                proj.options.storeUTM = false;
                await collection.updateOne({ _id: proj._id }, { $set: { "options.storeUTM": false } });
            }
        }

        // Done, set version and return true!
        setDatabaseVersion(databaseVersion);
        return true;
    } catch (e) {
        // Ouch
        console.log(`Database migration failed catastrophically: ${e}`);
        return false;
    }
}
