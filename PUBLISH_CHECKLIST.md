# Pre-publish checklist (single public repo)

Use this before making the repo public. Strategy: **single public repo**; client-specific config (env, Celigo/NetSuite credentials, branding) stays outside the repo.

**Already done in this repo:** `.gitignore` (env, `/data/`, `*.db`, dumps, temp, cache); `.env.example` (no machine paths); `!.env.example` so the example is committed; README setup + env table; `LICENSE` (MIT); `SECURITY.md`. You still need to: verify no secrets in history, run secret scan, confirm ownership/assets, and do the safety gates before push.

---

## 1) Secrets and credentials

- [ ] No API keys/tokens/passwords in repo history
- [ ] Use `.env` locally; commit only `.env.example`
- [ ] Rotate any key that was ever committed (even briefly)

---

## 2) Client/private data

- [ ] Remove client names, emails, account IDs, addresses
- [ ] Remove raw exports, screenshots, logs with sensitive fields
- [ ] Replace with fake/sample data that keeps structure

---

## 3) Config and environment safety

- [ ] `.gitignore` includes: `.env*`, `/data/`, `*.db`, `*.db-wal`, `*.db-shm`, dumps, temp, cache, `node_modules`, build outputs
- [ ] No local absolute paths or machine-specific credentials in code or docs
- [ ] Clear setup instructions in README (install, env from `.env.example`, run steps)

---

## 4) Database and migrations

- [ ] Schema/migrations in repo only if safe (e.g. SQL in `src/lib/db.ts` or a migrations folder with DDL only—no production data)
- [ ] No production DB URLs in scripts or docs (SQLite path is local `data/price-checker.db` or `SQLITE_PATH`; document as such)
- [ ] Seed data is synthetic (e.g. `src/lib/mock-products.ts`); no real client product/barcode data

---

## 5) Code/content sanitization

- [ ] Search for hardcoded secrets: `key`, `token`, `password`, `bearer`, `sk-`
- [ ] Search for client identifiers in comments and test fixtures
- [ ] Remove internal-only notes that reveal business-sensitive logic

---

## 6) Legal + ownership

- [ ] Confirm you own or have rights to share the code and assets
- [ ] Remove licensed assets you can’t redistribute
- [ ] Add `LICENSE` (e.g. MIT, Apache-2.0)

---

## 7) Repo hygiene

- [ ] README: purpose, architecture, run steps, limitations, kiosk/deployment notes
- [ ] Optional: `SECURITY.md` with vulnerability contact path
- [ ] Example config (`.env.example`) and, if helpful, example request/response for sync API

---

## 8) Safety gates before push

- [ ] `git status` clean of accidental files (no `.env`, no `data/*.db*`)
- [ ] `git diff --staged` reviewed line-by-line
- [ ] Run secret scan (e.g. gitleaks, trufflehog) if available
- [ ] Squash or clean commits that contain sensitive history before pushing to public

---

## 9) Publishing strategy (single repo)

- [ ] Single public repo is the only source of truth; client work = same repo + private config (`.env`, Celigo/NetSuite, optional branding) outside repo
- [ ] If existing history is messy, consider a fresh public repo and push only sanitized code (or use history-rewrite with care)
- [ ] Tag first public release once sanitized (e.g. `v1.0.0`)

---

## 10) Quick command checklist

```bash
# If you ever committed a secret or DB file:
git rm --cached <accidentally-tracked-secret-file>
# e.g. git rm --cached .env data/price-checker.db

# Update .gitignore (already includes .env*, /data/, *.db, *.db-wal, *.db-shm)
# Then:
git add -p
git commit -m "Sanitize repo for public release"
# Push to public origin (or new public repo)
```

---

*Data note: Database files (`data/price-checker.db`, `*.db-wal`, `*.db-shm`) must not be committed; they are listed in `.gitignore`. Only schema/seed with synthetic data belongs in the repo.*
