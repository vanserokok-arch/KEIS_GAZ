import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export interface AppDbContext {
  db: Database.Database;
  dbPath: string;
}

let cached: AppDbContext | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function applyMigrations(db: Database.Database): void {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fio TEXT NOT NULL,
      address TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      contract_number TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      case_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_contract_number
      ON contracts(contract_number);

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      display_name TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const addCasePath = db
    .prepare("SELECT name FROM pragma_table_info('contracts') WHERE name = 'case_path'")
    .get() as { name?: string } | undefined;
  if (!addCasePath?.name) {
    db.exec("ALTER TABLE contracts ADD COLUMN case_path TEXT");
  }
}

export function createAppDb(dbDir: string): AppDbContext {
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "keis.sqlite3");
  const db = new Database(dbPath);
  applyMigrations(db);
  db.pragma(`user_version = 1`);
  return { db, dbPath };
}

export function getAppDb(dbDir: string): AppDbContext {
  if (cached) {
    return cached;
  }
  cached = createAppDb(dbDir);
  return cached;
}

export function resetAppDbForTests(): void {
  if (cached) {
    cached.db.close();
    cached = null;
  }
}

export function timestamps(): { createdAt: string; updatedAt: string } {
  const iso = nowIso();
  return { createdAt: iso, updatedAt: iso };
}
