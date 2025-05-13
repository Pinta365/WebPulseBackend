import { getProjectConfiguration, insertEvent } from "../src/db.ts";
import { getCountryFromIP, getOrigin, getUserAgent } from "../src/helpers.ts";
import type { IncomingEventPayload, Project, UserAgentData } from "../src/types.ts";

export async function track(payload: IncomingEventPayload, req: Request) {
    const origin = getOrigin(req);

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

        await insertEvent(payload as any);

        return 200;
    } else {
        return 403;
    }
}
