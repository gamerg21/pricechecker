# Pricechecker manual CSV import workflow

A simple VM-side helper is now installed:

`/usr/local/bin/pricechecker-import-csv`

## What it does
- creates a timestamped backup of the SQLite DB before each import
- runs the repo's `scripts/import-celigo-csv.ts` helper against the CSV
- imports/upserts the rows into the existing DB

## Usage on the VM
```bash
sudo /usr/local/bin/pricechecker-import-csv /path/to/export.csv
```

## Current tested sample path
```bash
sudo /usr/local/bin/pricechecker-import-csv /tmp/PriceCheckerItemExportToyWorldIncResults134-small.csv
```

## Typical future workflow
1. Copy the CSV to the VM (for example into `/tmp/`)
2. Run:
   ```bash
   sudo /usr/local/bin/pricechecker-import-csv /tmp/your-full-export.csv
   ```
3. Verify in the app/admin UI

## Notes
- This is currently an **upsert** workflow, not a destructive full replace.
- Matching is done by barcode, so re-importing a full CSV updates existing rows instead of creating duplicates for the same barcode.
- Products missing from a later CSV are **not** deleted automatically.
