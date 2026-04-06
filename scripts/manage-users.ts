#!/usr/bin/env node
/**
 * Admin user management CLI
 *
 * Usage:
 *   npm run users add <username>   — create a new admin user (prompts for password)
 *   npm run users list             — list all admin users
 *   npm run users remove <username> — delete an admin user
 */

import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

// ── Database setup (mirrors src/lib/db.ts) ──────────────────────────────────

const dbPath =
  process.env.SQLITE_PATH ||
  path.join(process.cwd(), "data", "price-checker.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Idempotent — safe to run on every invocation
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

// ── Password prompt (no echo) ────────────────────────────────────────────────

function promptPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let value = "";

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (char: string) => {
      if (char === "\r" || char === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        // Ctrl-C
        process.stdout.write("\n");
        process.exit(1);
      } else if (char === "\u007f") {
        // Backspace
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };

    process.stdin.on("data", onData);
  });
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function addUser(username: string) {
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (existing) {
    console.error(`Error: user "${username}" already exists.`);
    process.exit(1);
  }

  const password = await promptPassword(`Password for ${username}: `);
  const confirm = await promptPassword(`Confirm password: `);

  if (password !== confirm) {
    console.error("Error: passwords do not match.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Error: password must be at least 8 characters.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare(
    "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
  ).run(randomUUID(), username, hash, new Date().toISOString());

  console.log(`User "${username}" created.`);
}

function listUsers() {
  const rows = db
    .prepare(
      "SELECT username, created_at FROM users ORDER BY created_at ASC",
    )
    .all() as { username: string; created_at: string }[];

  if (rows.length === 0) {
    console.log("No admin users found.");
    return;
  }

  const maxLen = Math.max(...rows.map((r) => r.username.length), "Username".length);
  console.log(`${"Username".padEnd(maxLen)}  Created at`);
  console.log(`${"-".repeat(maxLen)}  ${"─".repeat(24)}`);
  for (const row of rows) {
    console.log(`${row.username.padEnd(maxLen)}  ${row.created_at}`);
  }
}

function removeUser(username: string) {
  const result = db
    .prepare("DELETE FROM users WHERE username = ?")
    .run(username);

  if (result.changes === 0) {
    console.error(`Error: user "${username}" not found.`);
    process.exit(1);
  }
  console.log(`User "${username}" removed.`);
}

// ── Entrypoint ────────────────────────────────────────────────────────────────

const [command, arg] = process.argv.slice(2);

switch (command) {
  case "add":
    if (!arg) {
      console.error("Usage: npm run users add <username>");
      process.exit(1);
    }
    await addUser(arg);
    break;

  case "list":
    listUsers();
    break;

  case "remove":
    if (!arg) {
      console.error("Usage: npm run users remove <username>");
      process.exit(1);
    }
    removeUser(arg);
    break;

  default:
    console.error(
      "Usage:\n" +
        "  npm run users add <username>\n" +
        "  npm run users list\n" +
        "  npm run users remove <username>",
    );
    process.exit(1);
}
