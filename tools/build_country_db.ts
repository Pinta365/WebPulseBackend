/**
 * Builds bin/country-db.bin from the DB-IP Lite country database.
 *
 * Source data is CC BY 4.0, which permits redistribution, so the built file can
 * be committed and ship with a clone or a deployment. Attribution is required:
 * a link back to DB-IP.com wherever results are shown.
 *
 * The CSV is a sorted list of [startIp, endIp, countryCode]. Packing it as a
 * sorted array of range starts plus a country index per range drops it from
 * ~29 MB to ~4.6 MB, and makes lookups a plain binary search — no reader
 * library and no file seeking, which keeps it portable to Deno Deploy.
 *
 * Re-run monthly, when DB-IP publishes a new release.
 *
 *   deno task build:country-db
 *
 * Downloaded CSVs are cached in tools/.country-db-cache/ (gitignored, ~29 MB).
 * Delete that directory to force a fresh download.
 */
const SOURCE = "https://github.com/sapics/ip-location-db/releases/download/latest";
const OUT = new URL("../bin/country-db.bin", import.meta.url);
const CACHE = new URL("./.country-db-cache/", import.meta.url);

/** Index reserved to mean "this range is unallocated" — see the gap handling below. */
const NO_COUNTRY = 255;

const MAGIC = "WPC1";

async function loadCsv(file: string): Promise<string> {
    await Deno.mkdir(CACHE, { recursive: true });
    const cached = new URL(file, CACHE);
    try {
        return await Deno.readTextFile(cached);
    } catch { /* not cached */ }

    console.log(`  downloading ${file}`);
    const res = await fetch(`${SOURCE}/${file}`);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    const text = await res.text();
    await Deno.writeTextFile(cached, text);
    return text;
}

const ipv4ToInt = (s: string) => s.split(".").reduce((a, o) => a * 256 + +o, 0) >>> 0;

/** Expands an IPv6 address to its high 64 bits. */
function ipv6ToHigh64(s: string): bigint {
    const [l, r] = s.split("::");
    const left = l ? l.split(":") : [];
    const right = r === undefined ? null : (r ? r.split(":") : []);
    const groups = right === null ? left : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];

    let v = 0n;
    for (let i = 0; i < 4; i++) v = (v << 16n) | BigInt(parseInt(groups[i] || "0", 16));
    return v;
}

interface Packed<T> {
    starts: T[];
    countries: number[];
    gaps: number;
    truncated: number;
}

/**
 * Turns [start, end, cc] rows into (start -> countryIndex) entries.
 *
 * Only the start of each range is stored: the end is implied by the next entry.
 * Where the source has a gap between ranges — unallocated address space — a
 * NO_COUNTRY sentinel is inserted, otherwise a lookup landing in the gap would
 * wrongly inherit the previous range's country.
 */
function pack<T extends number | bigint>(
    rows: string[],
    parse: (s: string) => T,
    indexOf: (cc: string) => number,
    inc: (v: T) => T,
): Packed<T> {
    const starts: T[] = [];
    const countries: number[] = [];
    let gaps = 0;
    let truncated = 0;
    let prevEnd: T | null = null;

    for (const line of rows) {
        const comma1 = line.indexOf(",");
        const comma2 = line.indexOf(",", comma1 + 1);
        const start = parse(line.slice(0, comma1));
        const end = parse(line.slice(comma1 + 1, comma2));
        const cc = line.slice(comma2 + 1).trim();

        // Two ranges collapsing onto the same key: keep the first, since the
        // source is ascending and the first covers the lower addresses.
        if (starts.length > 0 && start <= starts[starts.length - 1]) {
            truncated++;
            continue;
        }

        if (prevEnd !== null && start > inc(prevEnd)) {
            starts.push(inc(prevEnd));
            countries.push(NO_COUNTRY);
            gaps++;
        }

        starts.push(start);
        countries.push(indexOf(cc));
        prevEnd = end;
    }

    return { starts, countries, gaps, truncated };
}

console.log("Building country database from DB-IP Lite (CC BY 4.0)\n");

const countryList: string[] = [];
const countryIndex = new Map<string, number>();
const indexOf = (cc: string) => {
    let i = countryIndex.get(cc);
    if (i === undefined) {
        i = countryList.length;
        countryList.push(cc);
        countryIndex.set(cc, i);
    }
    return i;
};

const v4Csv = await loadCsv("dbip-country-ipv4.csv");
const v6Csv = await loadCsv("dbip-country-ipv6.csv");

/**
 * Identifies the source data this file was built from.
 *
 * Deliberately a content hash rather than a build timestamp: the output must be
 * byte-identical when the input is unchanged, so CI can tell "DB-IP published an
 * update" from "the build ran again" with `git diff` on this file alone.
 */
const sourceHash = new DataView(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v4Csv + v6Csv)),
).getUint32(0, true);

const v4Rows = v4Csv.trimEnd().split("\n");
const v6Rows = v6Csv.trimEnd().split("\n");

const v4 = pack<number>(v4Rows, ipv4ToInt, indexOf, (v) => (v + 1) >>> 0);
const v6 = pack<bigint>(v6Rows, ipv6ToHigh64, indexOf, (v) => v + 1n);

if (countryList.length >= NO_COUNTRY) {
    throw new Error(`${countryList.length} country codes will not fit in a byte index`);
}

console.log(
    `\n  ipv4  ${v4Rows.length.toLocaleString("en-US")} rows -> ${v4.starts.length.toLocaleString("en-US")} entries (${
        v4.gaps.toLocaleString("en-US")
    } gap markers)`,
);
console.log(
    `  ipv6  ${v6Rows.length.toLocaleString("en-US")} rows -> ${v6.starts.length.toLocaleString("en-US")} entries (${
        v6.gaps.toLocaleString("en-US")
    } gap markers, ${v6.truncated} dropped below /64)`,
);
console.log(`  ${countryList.length} distinct country codes`);

// Warn about codes Intl cannot name, since the runtime derives countryLong from
// the code rather than shipping a name table.
const display = new Intl.DisplayNames(["en"], { type: "region" });
const unnamed = countryList.filter((cc) => {
    try {
        return display.of(cc) === cc;
    } catch {
        return true;
    }
});
if (unnamed.length) console.log(`  codes with no Intl display name: ${unnamed.join(", ")}`);

// ---------------------------------------------------------------------------
// Layout. Sections are padded so the typed-array views are correctly aligned.
// ---------------------------------------------------------------------------
const align = (n: number, to: number) => Math.ceil(n / to) * to;

const HEADER = 24;
const countryBytes = countryList.length * 2;
const v4StartsAt = align(HEADER + countryBytes, 8);
const v4CcAt = v4StartsAt + v4.starts.length * 4;
const v6StartsAt = align(v4CcAt + v4.countries.length, 8);
const v6CcAt = v6StartsAt + v6.starts.length * 8;
const total = v6CcAt + v6.countries.length;

const buf = new ArrayBuffer(total);
const bytes = new Uint8Array(buf);
const view = new DataView(buf);

for (let i = 0; i < 4; i++) view.setUint8(i, MAGIC.charCodeAt(i));
view.setUint32(4, sourceHash, true);
view.setUint16(8, countryList.length, true);
view.setUint32(12, v4.starts.length, true);
view.setUint32(16, v6.starts.length, true);
view.setUint32(20, v4StartsAt, true);

countryList.forEach((cc, i) => {
    bytes[HEADER + i * 2] = cc.charCodeAt(0);
    bytes[HEADER + i * 2 + 1] = cc.charCodeAt(1);
});

new Uint32Array(buf, v4StartsAt, v4.starts.length).set(v4.starts);
bytes.set(v4.countries, v4CcAt);
new BigUint64Array(buf, v6StartsAt, v6.starts.length).set(v6.starts);
bytes.set(v6.countries, v6CcAt);

await Deno.writeFile(OUT, bytes);

console.log(`\n  wrote ${OUT.pathname.replace(/^\//, "")}`);
console.log(`  ${(total / 1048576).toFixed(2)} MB, source ${sourceHash.toString(16).padStart(8, "0")}`);
console.log(`  (build is deterministic: identical source produces an identical file)`);
console.log(`\n  Remember: DB-IP Lite is CC BY 4.0 and requires a link back to DB-IP.com`);
console.log(`  on any page that displays results from it.`);
