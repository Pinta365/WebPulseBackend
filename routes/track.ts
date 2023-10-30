import { Request } from "../deps.ts";
import { getProjectConfiguration, insertEvent, Project } from "../src/db.ts";
import { getCountryFromIP, getOrigin, getUserAgent } from "../src/helpers.ts";

export async function track(body: string, req: Request) {
    const origin = getOrigin(req);
    const payload = JSON.parse(body);

    const project = await getProjectConfiguration(payload?.projectId, origin) as Project;

    if (project && project.id) {
        payload.timestamp = Date.now();

        if (project.options.pageLoads.storeUserAgent) {
            const userAgent = getUserAgent(req);
            payload.userAgent = userAgent;
        }

        //if (project.options.pageLoads.storeLocation) {
        // Använder parametern för UA så länge.
        
        if (project.options.pageLoads.storeUserAgent) {
            const location = await getCountryFromIP(req);
            if (location) {
                payload.location = location;
            }
        }
        
        await insertEvent(payload);

        return 200;
    } else {
        return 403;
    }
}
