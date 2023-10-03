import { Logger, LoggerData } from "../logger_manager.ts";
import { MongoClient } from "../../deps.ts";

const mongoApiKey = Deno.env.get("MONGODB_API_KEY") || "";
const mongoEP = Deno.env.get("MONGODB_ENDPOINT") || "";
const mongoDS = Deno.env.get("MONGODB_DATA_SOURCE") || ""
let mongoClient: MongoClient | null = null;

export class mongodbLogger implements Logger {
    async log(data: LoggerData): Promise<void>  {
        const { payload } = data;
        await insertEvent(payload);
        console.log("Received Data:", JSON.stringify(data, null, 2));
    }
}

async function insertEvent(payload: LoggerData["payload"]) {
    try {
        if (!mongoClient) {
            mongoClient = new MongoClient({
                endpoint: mongoEP,
                dataSource: mongoDS,
                auth: {
                    apiKey: mongoApiKey,
                },
            });
        }
        await mongoClient.database("WebTrace").collection("events").insertOne(payload);
    } catch (error) {
        console.error("Error writing event:", error);
    }
}

/*
export const characterProfessionCollection = database.collection<Character>(
    "characterProfessions",
);

        const doesCharExist = await characterProfessionCollection.findOne({
            name: thisMember.name,
            realmSlug: thisMember.realmSlug,
        });

        if (doesCharExist) {
            console.log(`Updating ${thisMember.name}`);
            await characterProfessionCollection.updateOne({
                name: thisMember.name,
                realmSlug: thisMember.realmSlug,
            }, {
                $set: thisMember,
            });
        } else {
            console.log(`Inserting ${thisMember.name}`);
            await characterProfessionCollection.insertOne(thisMember);
        }
*/