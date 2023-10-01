import { initTracking } from "../client.js";
import { config } from "../config.ts";

export function getClient(trackId: string) {
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
                ...config.commonHeaders,
            },
        });
    } else {
        return new Response(null, {
            status: 403,
            headers: config.commonHeaders,
        });
    }
}
