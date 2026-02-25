# Release v0.1.0-alpha

First alpha release of **Price Checker**: a simple, customer-facing app for looking up product details and price by scanning a barcode.

## What it does

- **Scan or enter a barcode** – Customers (or staff) scan a product barcode with a handheld scanner, or type it in. The app looks up the item and shows **name, description, price, and image** right away.
- **Runs locally** – The app and its product database run on a single server (e.g. a PC or Raspberry Pi) on your store or office network. Lookups are fast because everything stays on the same machine.
- **Kiosk-friendly** – Designed for use on a dedicated device: one full-screen page, no navigation, scanner-first. You lock the device or browser to this URL so users only see the price checker.

## How it’s meant to be used

1. **Deploy** the app on a server on your local network (e.g. port 3100).
2. **Load product data** – Either use the built-in sample data or send your own product list to the sync API so the local database is filled with your items (barcode, name, price, image).
3. **Open the app** on your scanner device or kiosk (e.g. `http://your-server:3100/`) and optionally lock the device to that page.
4. **Scan** – Point the scanner at a product barcode. The app clears the previous result, runs the lookup, and shows the new product and price. No need to tap “Search” if the scanner sends Enter after the barcode.

Typical setups: a store kiosk where customers check prices, or a back-office handheld where staff verify items and prices. Product data can later be synced from your existing system (e.g. NetSuite via Celigo) so the local database stays up to date.

## This release

- Single-page price checker UI with barcode input and product display
- Local SQLite database on the same server
- Lookup API by barcode and sync API to add/update products
- Optional admin view of the product table
- Basic kiosk and keyboard-suppression notes in the docs

**Version:** 0.1.0-alpha
