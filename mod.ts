import "https://deno.land/std@0.203.0/dotenv/load.ts";
import { initTracking } from "./src/client.js";
import { logData } from "./src/logger_manager.ts";
import { config } from "./src/config.ts"
import { getNastyStats } from "./src/nastyStats.ts"

// Configuration 


console.log("debug >>", "loggermode:", config.loggerMode, "mode:", config.mode, "baseURL:", config.baseURL, "allowedProjects:", config.allowedProjects)

Deno.serve(config.serveOptions, async (req) => {
    const commonHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type",
    };
    const method = req.method;
    const url = new URL(req.url);
    const qs = url.searchParams;

    // Origin check goes here ...

    if (url.pathname === "/client.js" && method === "GET") {
        const trackId = qs.get("trackId") || "";

        if (trackId && config.allowedProjects.includes(trackId)) {
            const [realmId, projectId] = trackId.split(".");

            const body = `
                ${initTracking.toString()}
                initTracking("${realmId}", "${projectId}", "${config.baseURL}");
            `;
            return new Response(body, {
                status: 200,
                headers: {
                    "content-type": "application/javascript",
                    ...commonHeaders,
                },
            });
        } else {
            return new Response(null, {
                status: 403,
                headers: commonHeaders,
            });
        }
    } else if (url.pathname === "/track" && method === "POST") {
        const body = await req.text();
        const data = JSON.parse(body);

        if (
            data?.payload?.realmId && data?.payload?.projectId &&
            config.allowedProjects.includes(`${data.payload.realmId}.${data.payload.projectId}`)
        ) {
            logData(data, config.loggerMode);

            return new Response(body, {
                status: 200,
                headers: commonHeaders,
            });
        } else {
            return new Response(null, {
                status: 403,
                headers: commonHeaders,
            });
        }
    } else if (url.pathname === "/" && method === "GET") {
        return new Response("This server is part of the WebTrace self-hosted analytics platform. https://github.com/Pinta365/WebTrace", {
            status: 200,
            headers: commonHeaders,
        });
    } else if (url.pathname === "/stats" && method === "GET") {
        const stats  = await getNastyStats();
        return new Response(stats, {
            status: 200,
            headers: commonHeaders,
        });
    }

    

    return new Response(null, { status: 404 });
});
