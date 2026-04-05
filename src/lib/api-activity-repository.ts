import { randomUUID } from "node:crypto";

import db from "@/lib/db";

export type ApiActivityLevel = "success" | "error" | "info";

export type ApiActivityRecord = {
  id: string;
  createdAt: string;
  route: string;
  method: string;
  status: number;
  level: ApiActivityLevel;
  message: string;
  detail: Record<string, unknown> | null;
};

type ActivityRow = {
  id: string;
  created_at: string;
  route: string;
  method: string;
  status: number;
  level: string;
  message: string;
  detail_json: string | null;
};

const insertStmt = db.prepare(`
  INSERT INTO api_activity (id, created_at, route, method, status, level, message, detail_json)
  VALUES (@id, @createdAt, @route, @method, @status, @level, @message, @detailJson)
`);

const listRecentStmt = db.prepare(`
  SELECT id, created_at, route, method, status, level, message, detail_json
  FROM api_activity
  ORDER BY created_at DESC
  LIMIT ?
`);

export function appendApiActivity(input: {
  route: string;
  method: string;
  status: number;
  level: ApiActivityLevel;
  message: string;
  detail?: Record<string, unknown> | null;
}): void {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const detailJson =
    input.detail != null && Object.keys(input.detail).length > 0
      ? JSON.stringify(input.detail)
      : null;

  insertStmt.run({
    id,
    createdAt,
    route: input.route,
    method: input.method,
    status: input.status,
    level: input.level,
    message: input.message,
    detailJson,
  });
}

export function listRecentApiActivity(limit = 100): ApiActivityRecord[] {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const rows = listRecentStmt.all(safeLimit) as ActivityRow[];
  return rows.map((row) => {
    let detail: Record<string, unknown> | null = null;
    if (row.detail_json) {
      try {
        detail = JSON.parse(row.detail_json) as Record<string, unknown>;
      } catch {
        detail = null;
      }
    }
    return {
      id: row.id,
      createdAt: row.created_at,
      route: row.route,
      method: row.method,
      status: row.status,
      level: row.level as ApiActivityLevel,
      message: row.message,
      detail,
    };
  });
}
