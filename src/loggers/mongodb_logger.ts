import { Logger, LoggerData } from "../logger_manager.ts";
import { MongoClient } from "../../deps.ts";

const mongoApiKey = Deno.env.get("MONGODB_API_KEY") || "";
const mongoEP = Deno.env.get("MONGODB_ENDPOINT") || "";
const mongoDS = Deno.env.get("MONGODB_DATA_SOURCE") || "";
let mongoClient: MongoClient | null = null;

export class mongodbLogger implements Logger {
    async log(data: LoggerData): Promise<void> {
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
        await mongoClient.database("WebPulse").collection("events").insertOne(payload);
    } catch (error) {
        console.error("Error writing event:", error);
    }
}
