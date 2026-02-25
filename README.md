# Price Checker (Next.js)

Customer-facing barcode price checker for scanner devices (e.g. handhelds with keyboard-wedge scanners).

Current implementation includes:

- Scan-friendly UI (keyboard wedge compatible)
- Product lookup API by barcode
- Mock local product cache
- Sync ingestion endpoint for future Celigo/NetSuite integration

## Run Locally

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment (optional)**  
   Copy the example env and edit if needed. The app runs without it; use it to protect the sync endpoint or override the DB path.

   ```bash
   cp .env.example .env
   ```

   | Variable       | Purpose |
   |----------------|--------|
   | `SYNC_API_KEY` | If set, `POST /api/sync/products` requires header `x-sync-key: <value>` |
   | `SQLITE_PATH`  | Override default DB path (default: `./data/price-checker.db`) |

3. **Run**

   ```bash
   npm run dev
   ```

   Open `http://localhost:3100`.

## Local SQL on Same Server

- Database is now local SQLite on the same machine as the web app.
- Default DB file: `data/price-checker.db`
- No separate SQL service/port is required for SQLite.
- Web app/API runs on port `3100`.
- If you later switch to PostgreSQL, that DB would run on its own port (for example `5432`) on the same server.

## API Endpoints

### Lookup Product

`GET /api/products?barcode=<barcode>`

Example:

```bash
curl "http://localhost:3100/api/products?barcode=012345678905"
```

### Sync/Upsert Products (MVP)

`POST /api/sync/products`

Payload:

```json
{
  "products": [
    {
      "id": "2001",
      "barcode": "123456789012",
      "sku": "SKU-2001",
      "name": "Sample Product",
      "description": "Sample description",
      "price": 9.99,
      "currency": "USD",
      "imageUrl": "https://example.com/image.jpg",
      "updatedAt": "2026-02-23T00:00:00.000Z"
    }
  ]
}
```

Optional security:

- Set `SYNC_API_KEY` in environment variables.
- Send header `x-sync-key: <your-key>` on sync requests.

### Admin Product Data View

- UI view: `http://localhost:3100/admin/products`
- API view: `GET http://localhost:3100/api/admin/products?limit=100`

## Preventing the on-screen keyboard

The app uses `inputMode="none"` so some browsers don’t show the keyboard when the barcode field is focused. **Whether the keyboard appears is largely controlled on the device**, not in the web app.

**On the device:**

1. **Android keyboard**  
   In **Settings → System → Languages & input → On-screen keyboard** (or **Virtual keyboard**), you can disable the default keyboard for the browser or use a “null” keyboard so scans still go to the focused field but no keyboard pops up.

2. **Scanner / DataWedge (where available)**  
   In the scanner/DataWedge profile used by your browser:
   - Ensure **Keystroke output** is enabled so the scanner sends characters + Enter to the focused field.
   - Some profiles have an option to **not show the keyboard** when delivering data; enable that if available.

3. **Enterprise Browser (where available)**  
   If you use Enterprise Browser instead of Chrome, you can use the **Sip (Software Input Panel) API** to hide the keyboard programmatically. The price-checker page doesn’t call it; configure it in your Enterprise Browser deployment if needed.

4. **Browser**  
   In Chrome (or the browser used on the device), check **Settings → Accessibility** or **Site settings** for options like “Show keyboard when a form field is focused” and turn it off for your price-checker URL if available.

So: **keyboard suppression is mainly done at the device/browser level**; the web app only hints via `inputMode="none"`.

## Kiosk mode (locked to this page only)

The app is built for **kiosk use**: one page, no navigation, scanner-only flow.

**How it looks in kiosk:**

- **Single full-screen view** – Price Checker title, barcode field (with “Auto” status), Clear button, then either an error message or the last product (image, name, description, **large price**, SKU/barcode).
- **No links or routes** – The only URL you open is the app root (e.g. `http://store-server:3100/`). There is no in-app nav; the admin UI lives at `/admin/products` on purpose so kiosks never open it if they only load the root URL.
- **Viewport locked** – `viewport` is set so the page doesn’t zoom (`maximumScale: 1`, `userScalable: false`) and uses the full screen (`viewportFit: cover`). Overscroll (pull-to-refresh, bounce) is disabled so the device stays on this page.

**Locking down the device to this page only:**

- **Enterprise / kiosk browser** – Use a kiosk profile that opens only the price-checker URL and disables the address bar, back button, and navigation.
- **Android kiosk app** – Run a kiosk/launcher app that starts the browser (or WebView) on your price-checker URL and blocks exiting (e.g. single-app mode).
- **Store server** – Serve only this app on the store LAN; point the device browser’s home/default URL to `http://<store-server>:3100/` so the kiosk always opens the price checker.

So far the app is **kiosk-ready**: single page, no in-app navigation, full-screen layout, and scanner-first flow. Lockdown is done on the **device/browser** (kiosk app or enterprise browser), not in the web code.

## Notes

- Current data storage is persistent local SQLite.
- Next phase: add Celigo/NetSuite payload mapping and scheduled sync jobs.
- Before publishing the repo, see **[PUBLISH_CHECKLIST.md](PUBLISH_CHECKLIST.md)**.
