import "https://deno.land/std@0.203.0/dotenv/load.ts";
import { config } from "./src/config.ts";
import { routes } from "./src/routes/routes.ts";

// Temporary debugging log.
console.log(
    "debug >>",
    "loggermode:",
    config.loggerMode,
    "mode:",
    config.mode,
    "baseURL:",
    config.baseURL,
    "allowedProjects:",
    config.allowedProjects,
);

Deno.serve(config.serveOptions, async (req) => {
    const method = req.method;
    const url = new URL(req.url);
    const qs = url.searchParams;

    // Origin check goes here ...

    try {
        if (url.pathname === "/client.js" && method === "GET") {
            const trackId = qs.get("trackId") || "";
            return routes.getClient(trackId);
        } else if (url.pathname === "/track" && method === "POST") {
            const body = await req.text();
            return routes.track(body);
        } else if (url.pathname === "/" && method === "GET") {
            return routes.root();
        } else if (url.pathname === "/stats" && method === "GET") {
            return routes.getNastyStats();
        } else {
            return new Response("Not Found", { status: 404 });
        }
    } catch (error) {
        console.error(`Error while processing request: ${error}`);
        return new Response("Internal Server Error", { status: 500 });
    }
});
