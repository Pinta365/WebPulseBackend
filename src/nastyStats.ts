/**
 * Just a quick 'n dirty test to extract some stats data.
 */
const database = await Deno.openKv();

async function countEvents(entries) {
    let pageLoads = 0;
    let pageClicks = 0;
    let pageScrolls = 0;

    for await (const entry of entries) {
        const event = entry.value;
        switch (event.type) {
            case "pageLoad":
                pageLoads++;
                break;
            case "pageClick":
                pageClicks++;
                break;
            case "pageScroll":
                pageScrolls++;
                break;
        }
    }
    return [pageLoads, pageClicks, pageScrolls];
}

export async function getNastyStats() {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfYesterday = new Date(startOfToday - 24 * 60 * 60 * 1000);
    const endOfYesterday = new Date(startOfToday - 1);

    const yesterdayEntries = database.list({
        start: [startOfYesterday.getTime()],
        end: [endOfYesterday.getTime()]
    });
    const yesterdaysEvents = await countEvents(yesterdayEntries);  

    const todayEntries = database.list({
        start: [startOfToday.getTime()],
        end: [Number.MAX_SAFE_INTEGER]
    });
    const todaysEvents = await countEvents(todayEntries);

    const stats = `YESTERDAY: Page Loads: ${yesterdaysEvents[0]}, Page Clicks: ${yesterdaysEvents[1]}, Page Scrolls: ${yesterdaysEvents[2]}
    TODAY: Page Loads: ${todaysEvents[0]}, Page Clicks: ${todaysEvents[1]}, Page Scrolls: ${todaysEvents[2]}`;
    return stats;
}