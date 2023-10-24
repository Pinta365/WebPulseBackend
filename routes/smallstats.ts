import { smallStats } from "../src/get_smallstats.ts";
import { getProjects } from "../src/db.ts";

export async function getSmallStats() {
    let stats = "";
    const projects = await getProjects();
    for await (const proj of projects) {
        stats += await smallStats(proj) + "\n";
    }

    return stats;
}