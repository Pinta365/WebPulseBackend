import { smallStats } from "../smallstats.ts";
import { getProjects } from "../project_settings.ts";
import { config } from "../config.ts";

export async function getSmallStats() {
    let stats = "";
    const projects = getProjects();
    for await (const proj of projects) {
        stats += await smallStats(proj) + "\n";
    }

    //const stats = await smallStats();
    return new Response(stats, {
        status: 200,
        headers: config.commonHeaders,
    });
}