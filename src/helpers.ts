import { decodeTime, ulid } from "@std/ulid";
import { UserAgent } from "@std/http";
import { LocationData } from "./types.ts";

/** Deno reports IPv4 peers as IPv4-mapped IPv6 ("::ffff:1.2.3.4"). */
export function normalizeIp(ip: string): string {
    const trimmed = ip.trim();
    return trimmed.startsWith("::ffff:") ? trimmed.slice("::ffff:".length) : trimmed;
}

/**
 * Resolves the client IP for a request.
 *
 * Deno Deploy does not set x-forwarded-for, so the address has to come from the
 * connection — that is what `connAddress` carries. Headers are still checked
 * first so this keeps working behind a reverse proxy that does set them.
 */
export function getIpFromRequest(req: Request, connAddress?: string): string | undefined {
    const fromHeaders = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        undefined;

    const ip = fromHeaders ?? connAddress;
    return ip ? normalizeIp(ip) : undefined;
}

// ---------------------------------------------------------------------------
// Country lookup, served from bin/country-db.bin (DB-IP Lite, CC BY 4.0).
//
// Lookups are local: a visitor's IP address never leaves this process, and is
// never stored. Rebuild the database with:
//
//   deno task build:country-db
//
// ATTRIBUTION: CC BY 4.0 requires a link back to DB-IP.com on any page that
// displays results derived from this data.
// ---------------------------------------------------------------------------

/** Country index meaning "unallocated address space" — see tools/build_country_db.ts. */
const NO_COUNTRY = 255;

interface CountryDb {
    countries: string[];
    v4Starts: Uint32Array;
    v4Cc: Uint8Array;
    v6Starts: BigUint64Array;
    v6Cc: Uint8Array;
}

let countryDb: CountryDb | null = null;
let countryDbLoad: Promise<CountryDb | null> | null = null;

async function loadCountryDb(): Promise<CountryDb | null> {
    try {
        const bytes = await Deno.readFile(new URL("../bin/country-db.bin", import.meta.url));
        const buf = bytes.buffer as ArrayBuffer;
        const view = new DataView(buf, bytes.byteOffset, bytes.byteLength);

        const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
        if (magic !== "WPC1") throw new Error(`unexpected magic ${JSON.stringify(magic)}`);

        const countryCount = view.getUint16(8, true);
        const v4Count = view.getUint32(12, true);
        const v6Count = view.getUint32(16, true);
        const v4StartsAt = view.getUint32(20, true);

        const countries: string[] = [];
        for (let i = 0; i < countryCount; i++) {
            countries.push(String.fromCharCode(bytes[24 + i * 2], bytes[24 + i * 2 + 1]));
        }

        const v4CcAt = v4StartsAt + v4Count * 4;
        const v6StartsAt = Math.ceil((v4CcAt + v4Count) / 8) * 8;
        const v6CcAt = v6StartsAt + v6Count * 8;

        countryDb = {
            countries,
            v4Starts: new Uint32Array(buf, bytes.byteOffset + v4StartsAt, v4Count),
            v4Cc: new Uint8Array(buf, bytes.byteOffset + v4CcAt, v4Count),
            v6Starts: new BigUint64Array(buf, bytes.byteOffset + v6StartsAt, v6Count),
            v6Cc: new Uint8Array(buf, bytes.byteOffset + v6CcAt, v6Count),
        };
        return countryDb;
    } catch (error) {
        console.error("Could not load bin/country-db.bin — country lookup disabled.", error);
        return null;
    }
}

/** Index of the last entry whose start is <= value, or -1. */
function findRange<T extends { length: number; [i: number]: number | bigint }>(
    starts: T,
    value: number | bigint,
): number {
    let lo = 0, hi = starts.length - 1, found = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (starts[mid] <= value) {
            found = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return found;
}

function parseIpv4(ip: string): number | null {
    const parts = ip.split(".");
    if (parts.length !== 4) return null;
    let v = 0;
    for (const p of parts) {
        const n = Number(p);
        if (!Number.isInteger(n) || n < 0 || n > 255) return null;
        v = v * 256 + n;
    }
    return v >>> 0;
}

/** High 64 bits of an IPv6 address; no country is allocated finer than a /64. */
function parseIpv6High64(ip: string): bigint | null {
    if (!ip.includes(":")) return null;
    try {
        const [l, r] = ip.split("::");
        const left = l ? l.split(":") : [];
        const right = r === undefined ? null : (r ? r.split(":") : []);
        const groups = right === null ? left : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
        if (groups.length < 4) return null;

        let v = 0n;
        for (let i = 0; i < 4; i++) {
            const g = parseInt(groups[i] || "0", 16);
            if (Number.isNaN(g)) return null;
            v = (v << 16n) | BigInt(g);
        }
        return v;
    } catch {
        return null;
    }
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * Resolves an IP to a country. Returns null for private, reserved or
 * unallocated addresses rather than guessing — the previous provider would
 * invent answers for those.
 */
export async function getCountryFromIP(ip: string | undefined): Promise<LocationData | null> {
    if (!ip) return null;

    const db = countryDb ?? await (countryDbLoad ??= loadCountryDb());
    if (!db) return null;

    let index: number;
    const v4 = parseIpv4(ip);
    if (v4 !== null) {
        index = findRange(db.v4Starts, v4);
        if (index < 0) return null;
        index = db.v4Cc[index];
    } else {
        const v6 = parseIpv6High64(ip);
        if (v6 === null) return null;
        index = findRange(db.v6Starts, v6);
        if (index < 0) return null;
        index = db.v6Cc[index];
    }

    if (index === NO_COUNTRY) return null;

    const countryShort = db.countries[index];
    if (!countryShort) return null;

    let countryLong = countryShort;
    try {
        countryLong = regionNames.of(countryShort) ?? countryShort;
    } catch { /* not a region code Intl knows; fall back to the code */ }

    return { countryShort, countryLong };
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && Object.getPrototypeOf(v) === Object.prototype;
}

/**
 * True when `sup` holds everything `sub` does: every leaf present on `sub`
 * exists on `sup` with an equal value. `sup` may hold strictly more.
 *
 * Used to decide whether an event's copy of a session-scoped field (userAgent,
 * location) is redundant. If the session's copy dominates the event's, dropping
 * the event's copy destroys no information. Anything that genuinely disagrees —
 * a bot reusing a sessionId, a visitor roaming between countries mid-session —
 * fails the check and is kept.
 *
 * null and undefined are treated alike, since the driver serialises undefined
 * as null: a missing value on `sub` is nothing to preserve, and a missing value
 * on `sup` cannot cover a present one on `sub`.
 */
export function dominates(sup: unknown, sub: unknown): boolean {
    if (sub === undefined || sub === null) return true;
    if (sup === undefined || sup === null) return false;

    if (isPlainObject(sub)) {
        if (!isPlainObject(sup)) return false;
        for (const [k, v] of Object.entries(sub)) {
            if (!dominates(sup[k], v)) return false;
        }
        return true;
    }

    if (Array.isArray(sub)) {
        if (!Array.isArray(sup) || sup.length !== sub.length) return false;
        return sub.every((v, i) => dominates(sup[i], v));
    }

    if (sub instanceof Date) return sup instanceof Date && sup.getTime() === sub.getTime();

    // BSON values such as ObjectId expose their own equality.
    const eq = (sub as { equals?: unknown }).equals;
    if (typeof eq === "function") return (eq as (o: unknown) => boolean).call(sub, sup);

    return sup === sub;
}

export function genULID(seedTime: number = Date.now()): string {
    return ulid(seedTime);
}

export function extractTimeFromULID(id: string): number {
    return decodeTime(id);
}

export function getUserAgent(req: Request): UserAgent {
    const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
    return userAgent;
}

export function getOrigin(req: Request) {
    const origin = req.headers.get("Origin") || "";
    return origin;
}

export function minifyJS(input: string): string {
    // Remove single line comments
    let output = input.replace(/\/\/[^\n]*\n/g, "");

    // Remove multi-line comments
    output = output.replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove whitespaces around punctuation (e.g., =, +, -, etc.)
    output = output.replace(/\s*([=+\-*/\{\};,])\s*/g, "$1");

    // Remove newline and whitespace
    output = output.replace(/\s+/g, " ");

    return output.trim();
}

export function minifyHTML(input: string): string {
    // Remove HTML comments
    let output = input.replace(/<!--[\s\S]*?-->/g, "");

    // Remove whitespaces between tags
    output = output.replace(/\s+</g, "<");
    output = output.replace(/>[\s\r\n]+</g, "><");

    // Remove unnecessary spaces within tags
    output = output.replace(/\s+/g, " ");

    return output.trim();
}
