import { Cron } from "../deps.ts";

export function initSchedule() {
    const dailyJob = new Cron("0 0 4 * * *", () => {
        console.log("Daily run!");
        // Download new ip2location database
    });

    console.log(`Next daily run scheduled at ${dailyJob.nextRun()}`);
}
