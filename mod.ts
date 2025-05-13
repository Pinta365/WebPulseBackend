import "https://deno.land/std@0.203.0/dotenv/load.ts";
import router from "./routes/routes.ts";
import { config } from "./src/config.ts";
import { getDatabase } from "./src/db.ts";
//import { getLocationDatabase } from "./src/helpers.ts";
import { Hono } from "@hono/hono";
import { initSchedule } from "./src/scheduler.ts";

// Temporary debugging log.
console.log("debug >>", config);

// Preload
try {
    // Mongo
    await getDatabase();
    // Location DB
    // Disabled for now.
    //getLocationDatabase();
    // Scheduler
    initSchedule();
} catch (e) {
    throw new Error(String(e));
}

const app = new Hono();

// CORS and headers middleware
app.use("*", async (c, next) => {
    c.header("Access-Control-Allow-Headers", "Content-Type");
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "POST, GET");
    await next();
});

// Use the router (which should be refactored to export a Hono instance or routes)
app.route("/", router);

if (config.serveHttps) {
    console.log(`Server running with HTTPS on port ${config.serverPort}`);
    Deno.serve({
        port: config.serverPort,
        cert: Deno.readTextFileSync("keys/cert.pem"),
        key: Deno.readTextFileSync("keys/key.pem"),
    }, app.fetch);
} else {
    console.log(`Server running with HTTP on port ${config.serverPort}`);
    Deno.serve({ port: config.serverPort }, app.fetch);
}
