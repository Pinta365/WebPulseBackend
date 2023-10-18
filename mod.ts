import "https://deno.land/std@0.203.0/dotenv/load.ts";
import { config } from "./src/config.ts";
import { routes } from "./src/routes/routes.ts";
import { getDatabase } from "./src/db.ts";

// Temporary debugging log.
console.log("debug >>", config);

// Preload DB
try {
    await getDatabase();
} catch (e) {
    console.error("Could not open database", e);
    Deno.exit();
}

// Serve as HTTPS?
const serveOptions = config.serveHttps
    ? {
        // Deno.serve with https
        port: config.serverPort,
        cert: Deno.readTextFileSync("./keys/cert.pem"),
        key: Deno.readTextFileSync("./keys/key.pem"),
    }
    : {
        // Deno.serve with http
        port: config.serverPort,
    };

Deno.serve(serveOptions, async (req) => {
    const method = req.method;
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);

    try {
        if (parts.length === 2 && parts[0] === "client" && method === "GET") {
            const projectid = parts[1];
            return await routes.getClient(projectid, req);
        } else if (parts.length === 1 && parts[0] === "track" && method === "POST") {
            const body = await req.text();
            return await routes.track(body, req);
        } else if (url.pathname === "/" && method === "GET") {
            return routes.root();
        } else if (url.pathname === "/smallstats" && method === "GET") {
            return await routes.getSmallStats();
        } else {
            return new Response("Not Found", { status: 404 });
        }
    } catch (error) {
        console.error(`Error while processing request: ${error}`);
        return new Response("Internal Server Error", { status: 500 });
    }
});
