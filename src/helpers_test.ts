/**
 * Tests for `dominates`, the rule that decides whether an event's copy of a
 * session-scoped field can be dropped. Both the ingest path (insertEvent) and
 * the historical sweep (dev/dedup_events.ts) depend on it, so a false positive
 * here silently destroys data.
 *
 *   deno test src/helpers_test.ts
 */
import { UserAgent } from "@std/http";
import { BSON } from "mongodb";
import { dominates, getIpFromRequest, normalizeIp } from "./helpers.ts";

function assert(cond: boolean, msg: string) {
    if (!cond) throw new Error(msg);
}

const CHROME =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";
const BINGBOT =
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";

/** Builds a userAgent payload the same way routes/track.ts does. */
function parse(raw: string) {
    const { browser, cpu, device, engine, os, ua } = new UserAgent(raw);
    return { browser, cpu, device, engine, os, ua };
}

/** Mimics a value that has been stored in and read back from MongoDB. */
function roundTrip<T>(value: T): T {
    return BSON.deserialize(BSON.serialize({ v: value })).v;
}

Deno.test("a freshly parsed user agent is dominated by its own stored copy", () => {
    for (const raw of [CHROME, BINGBOT, ""]) {
        const fresh = parse(raw);
        assert(
            dominates(roundTrip(fresh), fresh),
            `stored copy should dominate an identical fresh parse for: ${raw || "(empty)"}`,
        );
    }
});

Deno.test("a genuinely different user agent is not dominated", () => {
    const chrome = roundTrip(parse(CHROME));
    const bing = parse(BINGBOT);
    assert(!dominates(chrome, bing), "bingbot must not be dropped in favour of a stored Chrome UA");
    assert(!dominates(roundTrip(parse(BINGBOT)), parse(CHROME)), "and the reverse must also hold");
});

Deno.test("a degraded copy missing the raw ua string is dominated", () => {
    // The ~2,444 events from Oct 2023 whose userAgent had no `ua` field.
    const full = roundTrip(parse(CHROME));
    const degraded = { browser: full.browser, os: full.os };
    assert(dominates(full, degraded), "session holds strictly more, so the event copy is redundant");
    assert(!dominates(degraded, full), "but a degraded session copy cannot cover a full event copy");
});

Deno.test("location comparison", () => {
    const se = { countryShort: "SE", countryLong: "Sweden" };
    assert(dominates(roundTrip(se), { ...se }), "identical location is redundant");
    assert(!dominates({ countryShort: "FI", countryLong: "Finland" }, se), "a different country must be kept");
    assert(!dominates(undefined, se), "a session with no location cannot cover the event's");
    assert(dominates(se, undefined), "an event with no location has nothing to preserve");
});

Deno.test("the legacy location.debug IP is treated as extra information", () => {
    // 932 events from Oct-Nov 2023 carry an IP the session does not.
    const session = { countryShort: "SE", countryLong: "Sweden" };
    const event = { debug: "1.2.3.4", countryShort: "SE", countryLong: "Sweden" };
    assert(!dominates(session, event), "the event holds an extra field, so it must be kept");
});

Deno.test("null and undefined are interchangeable", () => {
    // The driver serialises undefined as null, so a round-tripped absent field
    // comes back as null and must still compare equal to a fresh undefined.
    assert(dominates({ a: null }, { a: undefined }), "undefined on the event is nothing to preserve");
    assert(dominates({ a: undefined }, { a: null }), "null on the event is nothing to preserve");
    assert(!dominates({ a: null }, { a: "x" }), "a real value is not covered by null");
});

Deno.test("nested partial differences are caught", () => {
    const session = roundTrip(parse(CHROME));
    const event = parse(CHROME);
    event.browser = { ...event.browser, version: "999.0.0.0" };
    assert(!dominates(session, event), "a differing nested leaf must block the drop");
});

Deno.test("arrays must match element-wise", () => {
    assert(dominates([1, 2, 3], [1, 2, 3]), "identical arrays");
    assert(!dominates([1, 2], [1, 2, 3]), "differing lengths are not dominated");
    assert(!dominates([1, 2, 3], [1, 9, 3]), "differing elements are not dominated");
});

// ---------------------------------------------------------------------------
// Client IP resolution
// ---------------------------------------------------------------------------
const req = (headers: Record<string, string> = {}) => new Request("https://example.com/track", { headers });

Deno.test("normalizeIp strips the IPv4-mapped IPv6 prefix", () => {
    // Exactly what a live Deno Deploy connection reports.
    assert(normalizeIp("::ffff:83.252.193.37") === "83.252.193.37", "mapped form should be unwrapped");
    assert(normalizeIp("  ::ffff:1.2.3.4  ") === "1.2.3.4", "and trimmed");
    assert(normalizeIp("83.252.193.37") === "83.252.193.37", "plain IPv4 is untouched");
    assert(normalizeIp("2001:db8::1") === "2001:db8::1", "real IPv6 is untouched");
});

Deno.test("getIpFromRequest falls back to the connection address", () => {
    // The Deno Deploy case: no proxy headers at all, address from the socket.
    assert(
        getIpFromRequest(req(), "::ffff:83.252.193.37") === "83.252.193.37",
        "must use the connection address when no headers are present",
    );
    // The regression itself: headers alone yield nothing.
    assert(getIpFromRequest(req()) === undefined, "no headers and no conn address means no IP");
});

Deno.test("getIpFromRequest still prefers proxy headers when present", () => {
    assert(
        getIpFromRequest(req({ "x-forwarded-for": "9.9.9.9" }), "1.1.1.1") === "9.9.9.9",
        "a real reverse proxy must win over the socket address",
    );
    assert(
        getIpFromRequest(req({ "x-forwarded-for": "9.9.9.9, 10.0.0.1, 10.0.0.2" })) === "9.9.9.9",
        "the originating client is the leftmost entry",
    );
    assert(
        getIpFromRequest(req({ "x-real-ip": "8.8.4.4" })) === "8.8.4.4",
        "x-real-ip is honoured when x-forwarded-for is absent",
    );
    assert(
        getIpFromRequest(req({ "x-forwarded-for": "  ::ffff:9.9.9.9  " })) === "9.9.9.9",
        "header values are normalised too",
    );
});
