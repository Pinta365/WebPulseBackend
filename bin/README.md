# bin/

## country-db.bin

Packed IP-to-country database, used by `getCountryFromIP` in `src/helpers.ts`.
Lookups are local — a visitor's IP address never leaves the process and is never
stored.

Built from **DB-IP Lite**, licensed under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

> **Attribution is required.** CC BY 4.0, and DB-IP's own terms, require a link
> back to [DB-IP.com](https://db-ip.com) on any page that displays or uses
> results derived from this data — that means the dashboard, wherever country
> statistics are shown.

CC BY 4.0 permits redistribution, so this file is committed and travels with a
clone or a deployment.

## Rebuilding

DB-IP publishes monthly:

```
deno task build:country-db
```

The tool lives in [`tools/build_country_db.ts`](../tools/build_country_db.ts).
It caches the downloaded CSVs in `tools/.country-db-cache/` (gitignored, ~29 MB);
delete that directory to force a fresh download.

The source is a sorted `startIp,endIp,countryCode` CSV. It is packed into a
sorted array of range starts plus a one-byte country index per range — the range
*end* is implied by the next start — which takes ~29 MB of CSV down to 4.6 MB
and reduces a lookup to a binary search of roughly 1 µs.

Two details in the format worth knowing:

- **Gap markers.** The source has unallocated holes between ranges. Storing only
  range starts would make a lookup inside a hole inherit the preceding country,
  so explicit "unallocated" sentinels are inserted and resolve to `null`.
- **IPv6 keys are the high 64 bits.** No country is allocated finer than a /64,
  and only a couple of hundred source ranges are, so the lowest wins.

Country *names* are not stored. `countryShort` is the stable key, and the
display name is derived at runtime via `Intl.DisplayNames`, so names stay
consistent regardless of what any data source calls a country.
