import { LoggerData, Project, getDatabase } from "./db.ts";
const database = await getDatabase();

function countEvents(entries: LoggerData[], startTime: number, endTime: number) {
    let pageLoads = 0;
    let pageSessions = 0;
    let pageClicks = 0;
    let pageScrolls = 0;
    const uniqueDeviceIds = new Set();

    for (const entry of entries) {
        const event = entry;
        if (event.timestamp >= startTime && event.timestamp < endTime) {
            switch (event.type) {
                case "pageLoad":
                    pageLoads++;
                    uniqueDeviceIds.add(event.deviceId);
                    break;
                case "pageSession":
                    pageSessions++;
                    break;
                case "pageClick":
                    pageClicks++;
                    break;
                case "pageScroll":
                    pageScrolls++;
                    break;
            }
        }
    }
    return { pageLoads, pageClicks, pageScrolls,  pageSessions, uniqueDevices: uniqueDeviceIds.size };
}

export async function smallStats(project: Project) {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).getTime();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1).getTime();
    const entriesIterator: Deno.KvListIterator<LoggerData> = database.list({
        start: [ project.id, startOfYesterday ],
        end: [ project.id, Number.MAX_SAFE_INTEGER ],
    });

    // Cache all entries
    const entries = [];
    for await (const entry of entriesIterator) entries.push(entry.value);

    // Count
    const yesterdaysEvents = countEvents(entries, startOfYesterday, startOfToday);
    const todaysEvents = countEvents(entries, startOfToday, now.getTime());
    const last30MinEvents = countEvents(entries, thirtyMinutesAgo, now.getTime());

    // Display
    const stats = `${project.name}
    YESTERDAY:\t\tSessions: ${yesterdaysEvents.pageSessions}\tLoads: ${yesterdaysEvents.pageLoads}\tClicks: ${yesterdaysEvents.pageClicks}\tScrolls: ${yesterdaysEvents.pageScrolls}\t Unique visitors: ${yesterdaysEvents.uniqueDevices}
    TODAY:\t\tSessions: ${todaysEvents.pageSessions}\tLoads: ${todaysEvents.pageLoads}\tClicks: ${todaysEvents.pageClicks}\tScrolls: ${todaysEvents.pageScrolls}\t Unique visitors: ${todaysEvents.uniqueDevices}
    30 MINUTES:\t\tSessions: ${last30MinEvents.pageSessions}\tLoads: ${last30MinEvents.pageLoads}\tClicks: ${last30MinEvents.pageClicks}\tScrolls: ${last30MinEvents.pageScrolls}\t Unique visitors: ${last30MinEvents.uniqueDevices}\n`;
    return stats;
}
