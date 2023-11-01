/**
 * WebPulseBackend Database Migration
 */
import { Db, setDatabaseVersion } from "../db.ts";

export const databaseVersion = "0.0.2";
export const changeLog = [
    "Moving storeUserAgent and storeLocation properties to the root level of the ProjectOptions interface.",
];

export async function migration(database: Db) {
    try {
        // ... do migration

        const collection = database.collection("projects");
        const projects = await collection.find({}).toArray();

        for (const proj of projects) {
            // Copy the values, default to true if they don't exist.
            const UA = proj.options.pageLoads.storeUserAgent !== undefined
                ? proj.options.pageLoads.storeUserAgent
                : true;
            const Loc = proj.options.pageLoads.storeLocation !== undefined
                ? proj.options.pageLoads.storeLocation
                : true;

            // Set the new properties
            proj.options.storeUserAgent = UA;
            proj.options.storeLocation = Loc;

            // Delete the old properties
            delete proj.options.pageLoads.storeUserAgent;
            delete proj.options.pageLoads.storeLocation;

            // Update the database
            await collection.updateOne({ _id: proj._id }, { $set: proj });
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
