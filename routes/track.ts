import { Request } from "../deps.ts";
import { getProjectConfiguration, insertEvent, Project, UserAgentData } from "../src/db.ts";
import { getCountryFromIP, getOrigin, getUserAgent } from "../src/helpers.ts";

export async function track(body: string, req: Request) {
    const origin = getOrigin(req);
    const payload = JSON.parse(body);

    const project = await getProjectConfiguration(payload?.projectId, origin) as Project;

    if (project && project._id) {
        payload.timestamp = Date.now();

        if (project.options.storeUserAgent) {
            const userAgent = getUserAgent(req);
            const { browser, cpu, device, engine, os, ua } = userAgent;
            payload.userAgent = { browser, cpu, device, engine, os, ua } as UserAgentData;
        }

        if (project.options.storeLocation) {
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
