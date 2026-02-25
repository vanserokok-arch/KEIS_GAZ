import type Database from "better-sqlite3";
import type { ClientDto } from "../../../shared/types";
import { timestamps } from "../app-db";

function mapClient(row: Record<string, unknown>): ClientDto {
  return {
    id: Number(row.id),
    fio: String(row.fio),
    address: row.address == null ? null : String(row.address),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export class ClientsRepo {
  public constructor(private readonly db: Database.Database) {}

  public list(search: string): ClientDto[] {
    const like = `%${search}%`;
    const rows = this.db
      .prepare(
        `SELECT * FROM clients
         WHERE (? = '' OR fio LIKE ? OR COALESCE(address, '') LIKE ?)
         ORDER BY updated_at DESC, id DESC`
      )
      .all(search, like, like) as Record<string, unknown>[];
    return rows.map(mapClient);
  }

  public create(input: { fio: string; address?: string }): ClientDto {
    const ts = timestamps();
    const result = this.db
      .prepare(
        `INSERT INTO clients (fio, address, created_at, updated_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(input.fio, input.address?.trim() || null, ts.createdAt, ts.updatedAt);
    return this.getById(Number(result.lastInsertRowid));
  }

  public update(input: { id: number; fio: string; address?: string }): ClientDto {
    const updatedAt = new Date().toISOString();
    const info = this.db
      .prepare("UPDATE clients SET fio=?, address=?, updated_at=? WHERE id=?")
      .run(input.fio, input.address?.trim() || null, updatedAt, input.id);
    if (info.changes < 1) {
      throw new Error("Client not found");
    }
    return this.getById(input.id);
  }

  public getById(id: number): ClientDto {
    const row = this.db.prepare("SELECT * FROM clients WHERE id=?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) {
      throw new Error("Client not found");
    }
    return mapClient(row);
  }
}
