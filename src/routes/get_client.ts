import { generateScript } from "../generate_client.ts";
import { config } from "../config.ts";
import { getOrigin, minifyJS } from "../helpers.ts";

export async function getClient(projectId: string, req: Request) {
    const origin = getOrigin(req);
    const body = await generateScript(projectId, origin);

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
