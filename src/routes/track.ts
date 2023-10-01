import { logData } from "../logger_manager.ts";
import { config } from "../config.ts";

export function track(body: string) {
    const data = JSON.parse(body);

    if (
        data?.payload?.realmId && data?.payload?.projectId &&
        config.allowedProjects.includes(`${data.payload.realmId}.${data.payload.projectId}`)
    ) {
        logData(data, config.loggerMode);

        return new Response(body, {
            status: 200,
            headers: config.commonHeaders,
        });
    } else {
        return new Response(null, {
            status: 403,
            headers: config.commonHeaders,
        });
    }
}
