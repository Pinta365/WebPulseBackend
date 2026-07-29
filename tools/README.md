# tools/

Checked-in maintenance tooling — things that produce or verify artefacts the project ships. Anything here is expected to
be runnable by a contributor or by CI after a plain clone.

This is deliberately separate from `dev/`, which is gitignored scratch: local probes, seeding helpers, one-off
migrations.

| tool                  | what it does                                   |
| --------------------- | ---------------------------------------------- |
| `build_country_db.ts` | Rebuilds `bin/country-db.bin` from DB-IP Lite. |

## build_country_db.ts

```
deno task build:country-db
```

Downloads the DB-IP Lite country CSVs and packs them into `bin/country-db.bin`, which `getCountryFromIP` in
`src/helpers.ts` reads. DB-IP publishes monthly, so that is a sensible cadence.

Downloaded CSVs are cached in `.country-db-cache/` here — about 29 MB, and gitignored. Delete it to force a fresh
download; the packed output is only 4.6 MB and _is_ committed, because DB-IP Lite is CC BY 4.0 and permits
redistribution.

See [`bin/README.md`](../bin/README.md) for the attribution requirement and the packed file format.

### The build is deterministic, on purpose

The file header stores a hash of the source CSVs rather than a build timestamp, so an unchanged upstream release
produces a byte-identical output. That is what lets
[`.github/workflows/update-country-db.yml`](../.github/workflows/update-country-db.yml) run monthly and open a PR
**only** when DB-IP has actually published new data — checked with `git status` on `bin/country-db.bin` alone, with no
need to track the raw CSVs.

If you change the packing logic, keep it deterministic or that workflow will start opening an empty PR every month.
