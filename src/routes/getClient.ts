import { generateScript } from "../generate_client.ts";
import { config } from "../config.ts";
import { minifyJS } from "../helpers.ts";

export function getClient(projectId: string, origin: string) {
    const body = generateScript(projectId, origin);

    if (body) {
        return new Response(minifyJS(body), {
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
