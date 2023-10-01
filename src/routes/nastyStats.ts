import { nastyStats } from "../nastyStats.ts";
import { config } from "../config.ts";

export async function getNastyStats() {
    const stats = await nastyStats();
    return new Response(stats, {
        status: 200,
        headers: config.commonHeaders,
    });
}
