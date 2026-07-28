import { Hono } from "@hono/hono";
import { getConnInfo } from "@hono/hono/deno";
import { getClient } from "./get_client.ts";
import { track } from "./track.ts";
import { root } from "./root.ts";
import { getIpFromRequest } from "../src/helpers.ts";

const app = new Hono();

app.post("/track", async (c) => {
    try {
        const data = await c.req.json();

        // The peer address is only reachable through the Hono context, not the
        // raw Request — on Deno Deploy there is no x-forwarded-for to fall back on.
        let connAddress: string | undefined;
        try {
            connAddress = getConnInfo(c).remote.address;
        } catch {
            // Not running on a Deno server; headers-only resolution still applies.
        }

        const trackerCode = await track(data, c.req.raw, getIpFromRequest(c.req.raw, connAddress));
        return c.body(null, trackerCode);
    } catch (error) {
        console.error(error);
        return c.json({ error: "Internal server error" }, 500);
    }
});

app.get("/client/:projectId", async (c) => {
    try {
        const projectId = c.req.param("projectId");
        const script = await getClient(projectId, c.req.raw);
        if (script) {
            c.header("Content-Type", "application/javascript");
            return c.body(script);
        } else {
            return c.body(null, 403);
        }
    } catch (error) {
        console.error(error);
        return c.json({ error: "Internal server error" }, 500);
    }
});

app.get("/", (c) => {
    try {
        c.header("Content-Type", "text/html");
        return c.body(root());
    } catch (error) {
        console.error(error);
        return c.json({ error: "Internal server error" }, 500);
    }
});

export default app;
