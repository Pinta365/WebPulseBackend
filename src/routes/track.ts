import { Request } from "../../deps.ts";
import { getProjectConfiguration, insertEvent, Project } from "../db.ts";
import { getOrigin, getUserAgent } from "../helpers.ts";

export async function track(body: string, req: Request) {
    const origin = getOrigin(req);
    const payload = JSON.parse(body);

    const project = await getProjectConfiguration(payload?.projectId, origin) as Project;

    if (project.id) {
        if (payload.type === "pageLoad" && project.options.pageLoads.storeUserAgent) {
            const userAgent = getUserAgent(req);
            payload.userAgent = userAgent.ua;
        }

        insertEvent(payload);

        return 200;
    } else {
        return 403;
    }
}
