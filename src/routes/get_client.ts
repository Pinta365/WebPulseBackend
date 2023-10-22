import { generateScript } from "../generate_client.ts";
import { config } from "../config.ts";
import { getOrigin, minifyJS, genULID } from "../helpers.ts";
import { getProjectConfiguration, Project } from "../db.ts";

export async function getClient(projectId: string, req: Request) {
    const origin = getOrigin(req);
    const pageLoadId = genULID();
    const project = await getProjectConfiguration(projectId, origin) as Project;
    const body = generateScript(project, pageLoadId, origin);

    if (project && body) {
        
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
