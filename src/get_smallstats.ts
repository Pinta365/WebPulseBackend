import { Project } from "./db.ts";
const database = await Deno.openKv(Deno.env.get("DENO_KV_LOCAL_DATABASE") || undefined);

async function countEvents(entries) {
    let pageLoads = 0;
    let pageClicks = 0;
    let pageScrolls = 0;
    const uniqueDeviceIds = new Set();

    for await (const entry of entries) {
        const event = entry.value;
        switch (event.type) {
            case "pageLoad":
                pageLoads++;
                uniqueDeviceIds.add(event.deviceId);
                break;
            case "pageClick":
                pageClicks++;
                break;
            case "pageScroll":
                pageScrolls++;
                break;
        }
    }
    return { pageLoads, pageClicks, pageScrolls, uniqueDevices: uniqueDeviceIds.size };
}

export async function smallStats(project: Project) {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfYesterday = new Date(startOfToday - 24 * 60 * 60 * 1000);
    const endOfYesterday = new Date(startOfToday - 1);

    const yesterdayEntries = database.list({
        start: [project.id, startOfYesterday.getTime()],
        end: [project.id, endOfYesterday.getTime()],
    });
    const yesterdaysEvents = await countEvents(yesterdayEntries);

    const todayEntries = database.list({
        start: [project.id, startOfToday.getTime()],
        end: [project.id, Number.MAX_SAFE_INTEGER],
    });
    const todaysEvents = await countEvents(todayEntries);

    const last30MinEntries = database.list({
        start: [project.id, thirtyMinutesAgo.getTime()],
        end: [project.id, now.getTime()],
    });
    const last30MinEvents = await countEvents(last30MinEntries);

    const stats = `${project.name}
    YESTERDAY:\t\tLoads: ${yesterdaysEvents.pageLoads}\tClicks: ${yesterdaysEvents.pageClicks}\tScrolls: ${yesterdaysEvents.pageScrolls}\t Unique visitors: ${yesterdaysEvents.uniqueDevices}
    TODAY:\t\tLoads: ${todaysEvents.pageLoads}\tClicks: ${todaysEvents.pageClicks}\tScrolls: ${todaysEvents.pageScrolls}\t Unique visitors: ${todaysEvents.uniqueDevices}
    30 MINUTES:\t\tLoads: ${last30MinEvents.pageLoads}\tClicks: ${last30MinEvents.pageClicks}\tScrolls: ${last30MinEvents.pageScrolls}\t Unique visitors: ${last30MinEvents.uniqueDevices}\n`;
    return stats;
}
