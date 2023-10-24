import { Context, Router } from "../deps.ts";
const router = new Router();

import { getClient } from "./get_client.ts";
import { track } from "./track.ts";
import { root } from "./root.ts";
import { getSmallStats } from "./smallstats.ts";

router.post("/track", async (ctx: Context) => {
    const data = await ctx.request.body().value;
    const trackerCode = await track(data, ctx.request);

    ctx.response.body = null;
    ctx.response.status = trackerCode;
});

router.get("/client/:projectId", async (ctx: Context) => {
    const projectId = ctx?.params?.projectId;
    const script = await getClient(projectId, ctx.request);

    if (script) {
        ctx.response.type = "application/javascript";
        ctx.response.body = script;
    } else {
        ctx.response.body = null;
        ctx.response.status = 403;
    }
});

router.get("/smallstats", async (ctx: Context) => {
    const stats = await getSmallStats();
    ctx.response.body = stats;
});

router.get("/", (ctx: Context) => {
    ctx.response.type = "text/html";
    ctx.response.body = root();
});

export default router;
