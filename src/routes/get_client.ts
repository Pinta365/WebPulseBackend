import { Request } from "../../deps.ts";
import { generateScript } from "../generate_client.ts";
import { genULID, getOrigin, minifyJS } from "../helpers.ts";
import { getProjectConfiguration, Project } from "../db.ts";

export async function getClient(projectId: string, req: Request) {
    const origin = getOrigin(req);
    const pageLoadId = genULID();
    const project = await getProjectConfiguration(projectId, origin) as Project;
    const body = generateScript(project, pageLoadId, origin);

    if (project && body) {
        return minifyJS(body);
    } else {
        return undefined;
    }
}
