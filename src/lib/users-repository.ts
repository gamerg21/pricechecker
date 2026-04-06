import db from "@/lib/db";

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
};

const findByUsernameStmt = db.prepare(
  "SELECT * FROM users WHERE username = ? LIMIT 1",
);

const listStmt = db.prepare(
  "SELECT id, username, created_at FROM users ORDER BY created_at ASC",
);

const insertStmt = db.prepare(
  "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
);

const deleteStmt = db.prepare("DELETE FROM users WHERE username = ?");

export function findUserByUsername(username: string): UserRow | null {
  return (findByUsernameStmt.get(username) as UserRow | undefined) ?? null;
}

export function listUsers(): Pick<UserRow, "id" | "username" | "created_at">[] {
  return listStmt.all() as Pick<UserRow, "id" | "username" | "created_at">[];
}

export function insertUser(
  id: string,
  username: string,
  passwordHash: string,
): void {
  insertStmt.run(id, username, passwordHash, new Date().toISOString());
}

export function deleteUser(username: string): boolean {
  const result = deleteStmt.run(username);
  return result.changes > 0;
}
