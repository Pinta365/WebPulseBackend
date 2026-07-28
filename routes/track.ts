import { getProjectConfiguration, insertEvent } from "../src/db.ts";
import { getOrigin, getUserAgent } from "../src/helpers.ts";
import type { IncomingEventPayload, Project, UserAgentData } from "../src/types.ts";

export async function track(payload: IncomingEventPayload, req: Request, clientIp?: string) {
    const origin = getOrigin(req);

    const project = await getProjectConfiguration(payload?.projectId, origin) as Project;

    if (project && project._id) {
        payload.timestamp = Date.now();

        if (project.options.storeUserAgent) {
            const userAgent = getUserAgent(req);
            const { browser, cpu, device, engine, os, ua } = userAgent;
            payload.userAgent = { browser, cpu, device, engine, os, ua } as UserAgentData;
        }

        // The country lookup is deferred to session creation rather than done
        // here: location is session-scoped, so resolving it per event meant an
        // external call on every request. The IP is passed alongside the payload,
        // never inside it, so it is never persisted.
        const ipForLookup = project.options.storeLocation ? clientIp : undefined;

        // deno-lint-ignore no-explicit-any
        await insertEvent(payload as any, ipForLookup);

        return 200;
    } else {
        return 403;
    }
}
