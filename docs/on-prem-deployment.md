# On-prem deployment: Celigo → Price Checker

This guide matches the production layout: **Celigo (cloud)** POSTs to your app’s sync API over **HTTPS**, while **price-checker devices** use an **internal URL** on your LAN. The app process listens on **port 3100**; **nginx** terminates TLS on **443** for internet-facing traffic.

## 1. Celigo: connector and flow

### Pick the application (destination)

- Use **REST API (HTTP)** or **HTTP** under **Universal connectors** in Celigo.
- Do **not** use PostgreSQL, Snowflake, or JDBC for this app—the integration is an HTTP POST to your Next.js server.

### Configure the HTTP destination

| Setting | Value |
|--------|--------|
| Method | `POST` |
| URL | `https://<your-public-hostname>/api/sync/products` |
| Headers | `Content-Type: application/json` |
| Headers (if `SYNC_API_KEY` is set on the server) | `x-sync-key: <same value as SYNC_API_KEY>` |
| Body | Export JSON. Prefer Celigo’s native `{ "page_of_records": [ ... ] }` or `{ "products": [ ... ] }`—see [README](../README.md) for field mapping. |

### Delta exports

- Set export type to **Delta** and use a **Last Modified** (or equivalent) field so only changed items are sent.

### Reachability (WAN)

- Celigo runs in the **cloud**. It must reach your **public** IP or DNS name, not `localhost`.
- Use **port forwarding** on your firewall (e.g. **WAN TCP 443 → VM internal IP:443**) to nginx, not directly exposing Node on the internet without TLS.

## 2. Application environment

Copy [`.env.example`](../.env.example) to `.env` on the server:

| Variable | Purpose |
|----------|--------|
| `SYNC_API_KEY` | Strong secret; when set, sync requests **must** send `x-sync-key` matching this value. |
| `SQLITE_PATH` | Optional override for DB file (default `./data/price-checker.db` under the app directory). |

## 3. Proxmox VM (baseline)

- **OS:** Debian 12 or Ubuntu LTS server, minimal.
- **Resources (starting point):** 2 vCPU, 4 GiB RAM, 32+ GiB disk; VirtIO disk and NIC; QEMU Guest Agent enabled.
- **Network:** VM on an internal subnet (e.g. “Servers” VLAN); **RFC1918 only**—no public IP on the VM.
- **IP:** Prefer a UniFi **DHCP reservation** for the VM’s MAC address so the address is stable.

Document: VM hostname, MAC, internal IP (e.g. `10.0.20.50`).

## 4. UniFi (UDM Pro / UniFi Network 10.x)

Names vary slightly by version; search for **Port forwarding** and **Traffic rules** / **Firewall**.

### Internet → sync (Celigo)

1. Confirm your **WAN** address is what DNS points to (or use the static IP in Celigo’s URL).
2. **Port forward:** WAN `443` → price checker VM **internal IP**, port `443` (nginx).
3. Optionally restrict **WAN inbound** to Celigo’s published egress IP ranges if you maintain that list.
4. After enablement, check **Threat Management / IDS** is not blocking legitimate POSTs.

**Hairpin / NAT loopback:** Many sites cannot use the **public** hostname from **inside** the LAN. Kiosks should use the **internal** URL (below), not the public DNS name, unless you have split DNS or hairpin working.

### Internal network → price checkers

1. Place devices on a trusted VLAN (e.g. Store/Staff), not **Guest**, unless you add an explicit allow to **only** this VM.
2. **Allow (LAN):** Source = kiosk VLAN → Destination = **VM IP**, TCP **3100** (direct to Node) or **443** if you also serve the UI via nginx internally.
3. **DNS:** Create a local record (e.g. `pricechecker.internal`) → VM IP so kiosks can open `http://pricechecker.internal:3100/`.
4. If VM and kiosks use **different VLANs**, allow **inter-VLAN** routing and place the allow rule above broad deny rules.
5. Product images may load from **HTTPS** CDNs; allow outbound HTTPS from kiosks or the VM per policy.

## 5. Linux hardening and perimeter (IPv4 only)

This guide assumes **IPv4 only**: the VM uses a private **IPv4** address, DNS for the public hostname is an **A** record, and **WAN port forwarding** targets that IPv4. Do not publish an **AAAA** record unless you intentionally deploy IPv6 end-to-end.

### Automatic updates

- On Debian/Ubuntu, enable `unattended-upgrades` so security patches apply without manual `apt upgrade`. 

### SSH

- Use **key-based** login; disable password authentication and direct **root** login over SSH.
- Do **not** port-forward **TCP 22** from the internet. Prefer SSH from a **management VLAN**, **VPN**, or the **Proxmox console** if you lock the firewall tightly.

### UFW from scratch (IPv4 only)

UFW ships on Ubuntu; on Debian install if needed: `sudo apt install ufw`.

1. **Turn off IPv6 in UFW** so it never writes IPv6 rules. Edit `/etc/default/ufw` and set:

   ```text
   IPV6=no
   ```

2. **Default policy:** block unsolicited inbound; allow outbound.

   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   ```

3. **SSH (pick one pattern — avoid locking yourself out; keep Proxmox console handy):**
   - Same-LAN admin, tied to the VM’s NIC (replace `ens18` with your interface from `ip -br a`):

     ```bash
     sudo ufw allow OpenSSH
     ```

     Or restrict to one interface:

     ```bash
     sudo ufw allow in on ens18 to any port 22 proto tcp comment 'SSH'
     ```

   - Stricter: only from an admin or VPN subnet (example `10.0.10.0/24`):

     ```bash
     sudo ufw allow from 10.0.10.0/24 to any port 22 proto tcp comment 'SSH admin net'
     ```

4. **Web (nginx):** allow **443**. Allow **80** as well if you use Let’s Encrypt **HTTP-01** (`/.well-known/acme-challenge/`).

   ```bash
   sudo ufw allow 443/tcp comment 'HTTPS nginx'
   sudo ufw allow 80/tcp comment 'HTTP ACME or redirect'
   ```

5. **Kiosks → Node on 3100 (optional):** only if devices use `http://<VM-IP>:3100/` and you want a host-level allow. Replace the subnet with your kiosk VLAN.

   ```bash
   sudo ufw allow from 10.0.30.0/24 to any port 3100 proto tcp comment 'Kiosk VLAN to Node'
   ```

   If Node listens only on **127.0.0.1** and kiosks use **nginx on 443** internally, skip port **3100** on UFW.

6. **Enable and verify:**

   ```bash
   sudo ufw enable
   sudo ufw status verbose
   sudo ss -tlnp
   ```

   Expect **nginx** listening on IPv4 **443** (and **80** if allowed); expect the app on **127.0.0.1:3100** when bound to localhost.

**WAN exposure:** only your router should present **443** to the internet. Do not add a UFW rule that exposes **3100** to the world; Celigo should hit **HTTPS** on **443** via nginx.

### Service user, data, and backups

- Run the app as a **non-root** user under **systemd** (see [deploy/price-checker.service.example](../deploy/price-checker.service.example)).
- **Backup** the SQLite file (`data/*.db`) on a schedule.

### Admin UI (`/admin/products`)

The admin page has **no application login**. Restrict access via **nginx** `allow` / VPN / management VLAN only.

## 6. nginx and systemd

- Example reverse proxy: [deploy/nginx-price-checker.conf.example](../deploy/nginx-price-checker.conf.example) (Let’s Encrypt paths—run `certbot` for your public hostname).
- Example service unit: [deploy/price-checker.service.example](../deploy/price-checker.service.example)

After `npm run build`, run `npm run start` (or the systemd unit) so Node listens on **3100**; nginx proxies `https://…/api/sync/products` to `http://127.0.0.1:3100`.

## 7. Verification checklist

1. **LAN:** `curl -I http://<VM-IP>:3100` — expect HTTP 200 from Next.js.
2. **Kiosk VLAN:** Open `http://<VM-IP>:3100/` in a browser.
3. **WAN (HTTPS):** POST to `https://<public-host>/api/sync/products` with JSON body—expect `401` if `SYNC_API_KEY` is set and header is missing; with key, expect `200` and `upsertedCount`.
4. **Celigo:** Run the flow, then open `/admin/products` or scan a barcode on `/`.

## 8. Quick sync test (curl)

```bash
curl -X POST "https://<public-host>/api/sync/products" \
  -H "Content-Type: application/json" \
  -H "x-sync-key: <your-key-if-set>" \
  -d '{"page_of_records":[{"internalId":"1","UPC Code (Variant)":"012345678905","Display Name":"Test","Item Name (Variant)":"SKU1","Sales Description":"Desc","Price (Variant)":1.99}]}'
```

On LAN only (no TLS): use `http://<VM-IP>:3100` instead of `https://<public-host>`.
