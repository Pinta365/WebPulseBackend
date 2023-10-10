import { logData } from "../logger_manager.ts";
import { getUserAgent, getOrigin } from "../helpers.ts";
import { getProjectSettings } from "../project_settings.ts";
import { config } from "../config.ts";

export function track(body: string, req: Request) {
    const origin = getOrigin(req);
    const userAgent = getUserAgent(req);
    const data = JSON.parse(body);
    data.payload.userAgent = userAgent.toJSON();

    const projectSettings = getProjectSettings(data?.payload?.projectId, origin);

    if (projectSettings && projectSettings.realm.id && projectSettings.project.id) {
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
