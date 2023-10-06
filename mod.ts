import "https://deno.land/std@0.203.0/dotenv/load.ts";
import { config } from "./src/config.ts";
import { routes } from "./src/routes/routes.ts";
import { isOriginAllowed } from "./src/helpers.ts";

// Temporary debugging log.
console.log("debug >>", config);

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
    const origin = req.headers.get("Origin") || "";

    try {
        // We want added security for these routes, origin whitelist for now.
        if ((url.pathname === "/client.js" && method === "GET") || (url.pathname === "/track" && method === "POST")) {
            // Only use the origin allow list in production.
            if (config.serverMode === "production" && !isOriginAllowed(origin)) {
                return new Response("Forbidden", { status: 403 });
            }

            if (url.pathname === "/client.js") {
                const projectid = url.searchParams.get("projectid") || "";
                return routes.getClient(projectid, origin);
            } else if (url.pathname === "/track") {
                const body = await req.text();
                return routes.track(body, origin);
            }
        } else if (url.pathname === "/" && method === "GET") {
            return routes.root();
        } else {
            return new Response("Not Found", { status: 404 });
        }
    } catch (error) {
        console.error(`Error while processing request: ${error}`);
        return new Response("Internal Server Error", { status: 500 });
    }

    // Add a default response at the end to ensure all paths return a Response.
    return new Response("Not Found", { status: 404 });
});
