import "https://deno.land/std@0.203.0/dotenv/load.ts";
import router from "./routes/routes.ts";
import { config } from "./src/config.ts";
import { getDatabase } from "./src/db.ts";
//import { getLocationDatabase } from "./src/helpers.ts";
import { Application } from "./deps.ts";
import { initSchedule } from "./src/scheduler.ts";

// Temporary debugging log.
console.log("debug >>", config);

// Preload
try {
    // Mongo
    await getDatabase();
    // Location DB
    //getLocationDatabase();
    // Scheduler
    initSchedule();
} catch (e) {
    throw new Error(e);
}

const app = new Application();

app.use(async (ctx, next) => {
    ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.headers.set("Access-Control-Allow-Methods", "POST, GET");
    await next();
});

app.use(router.routes());
app.use(router.allowedMethods());

// Serve as HTTPS?
const serveOptions = config.serveHttps
    ? {
        port: config.serverPort,
        secure: true,
        certFile: "keys/cert.pem",
        keyFile: "keys/key.pem",
    }
    : {
        // Deno.serve with http
        port: config.serverPort,
    };

console.log(`Server running on port ${config.serverPort}`);
await app.listen(serveOptions);
