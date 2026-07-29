import { Cron } from "@hexagon/croner";

export function initSchedule() {
    const dailyJob = new Cron("0 0 4 * * *", () => {
        // The country database (bin/country-db.bin) is rebuilt out of band with
        // `deno task build:country-db` and committed, because Deno Deploy's
        // filesystem is read-only and cannot be refreshed at runtime.
        // A self-hosted instance on a writable filesystem could refresh here
        // instead; DB-IP publishes monthly.
    });

    console.log(`Next daily run scheduled at ${dailyJob.nextRun()}`);
}
