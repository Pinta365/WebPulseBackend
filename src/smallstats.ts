
const database = await Deno.openKv(Deno.env.get("DENO_KV_LOCAL_DATABASE") || undefined);

async function countEvents(entries) {
    let pageLoads = 0;
    let pageClicks = 0;
    let pageScrolls = 0;
    let uniqueDeviceIds = new Set();

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
    return {pageLoads, pageClicks, pageScrolls,  uniqueDevices: uniqueDeviceIds.size};
}

export async function smallStats(project) {
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
    YESTERDAY: Page Loads: ${yesterdaysEvents.pageLoads}, Page Clicks: ${yesterdaysEvents.pageClicks}, Page Scrolls: ${yesterdaysEvents.pageScrolls}, Unique visitors: ${yesterdaysEvents.uniqueDevices}
    TODAY: Page Loads: ${todaysEvents.pageLoads}, Page Clicks: ${todaysEvents.pageClicks}, Page Scrolls: ${todaysEvents.pageScrolls}, Unique visitors: ${todaysEvents.uniqueDevices}
    LAST 30 MINUTES: Page Loads: ${last30MinEvents.pageLoads}, Page Clicks: ${last30MinEvents.pageClicks}, Page Scrolls: ${last30MinEvents.pageScrolls}, Unique visitors: ${last30MinEvents.uniqueDevices}`;
    return stats;
    
}