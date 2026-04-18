# Changelog

## 1.0.0 - 2026-04-18

### Added
- Added a global footer version label so every page displays the current app version.

### Changed
- Finalized the initial stable release as version `1.0.0`.
- Improved barcode lookup flow by clearing the input after each scan on both kiosk lookup pages.

### Notes
- This release promotes the app from beta to the first stable `1.0.0` release.
- Previous release: `v0.2.0-beta`

## 0.2.0-beta - 2026-04-07

### Added
- Added admin authentication with NextAuth and SQLite-backed users.
- Added admin product pagination, search, and CSV import entry points.
- Added API activity logging and an admin activity view for sync/import visibility.
- Added wholesale price support across product storage, lookup, admin views, and CSV/Celigo imports.
- Added barcode-scanning UI improvements, including html5-qrcode support and clearer product presentation.
- Added CLI CSV import workflow for NetSuite/Celigo exports.

### Changed
- Improved Celigo payload handling to support wrapper-shaped records and more resilient sync normalization.
- Hardened product upsert behavior to better handle barcode/id drift and conflicting import rows.
- Improved kiosk and product detail UI, including cleaner descriptions and clearer retail/wholesale pricing display.
- Enhanced admin login UX and general product browsing/search flows.
- Updated Next.js compatibility by moving middleware behavior to `proxy.ts`.

### Fixed
- Removed automatic mock/demo data seeding from live product storage.
- Restored native keyboard input behavior on the kiosk page.
- Fixed the user-management CLI entrypoint for CommonJS/top-level await issues.
- Fixed deployment/runtime issues around import/build behavior discovered during VM rollout.

### Notes
- This beta includes the production hardening work needed for CSV imports, Celigo syncs, wholesale price support, and protected admin access.
- Previous release: `v0.1.0-alpha`
