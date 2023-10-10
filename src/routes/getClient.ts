import { generateScript } from "../generate_client.ts";
import { config } from "../config.ts";
import { minifyJS, getOrigin } from "../helpers.ts";

export function getClient(projectId: string, req: Request) {
    const origin = getOrigin(req);
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
