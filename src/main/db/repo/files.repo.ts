import type Database from "better-sqlite3";
import type { FileRecordDto } from "../../../shared/types";

function mapFile(row: Record<string, unknown>): FileRecordDto {
  return {
    id: Number(row.id),
    contractId: Number(row.contract_id),
    kind: String(row.kind),
    displayName: String(row.display_name),
    relativePath: String(row.relative_path),
    createdAt: String(row.created_at)
  };
}

export class FilesRepo {
  public constructor(private readonly db: Database.Database) {}

  public create(input: {
    contractId: number;
    kind: string;
    displayName: string;
    relativePath: string;
  }): FileRecordDto {
    const createdAt = new Date().toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO files (contract_id, kind, display_name, relative_path, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(input.contractId, input.kind, input.displayName, input.relativePath, createdAt);
    return this.getById(Number(result.lastInsertRowid));
  }

  public listByContract(contractId: number): FileRecordDto[] {
    const rows = this.db
      .prepare("SELECT * FROM files WHERE contract_id=? ORDER BY id DESC")
      .all(contractId) as Record<string, unknown>[];
    return rows.map(mapFile);
  }

  public listByIds(ids: number[]): FileRecordDto[] {
    if (ids.length === 0) {
      return [];
    }
    const placeholders = ids.map(() => "?").join(", ");
    const rows = this.db
      .prepare(`SELECT * FROM files WHERE id IN (${placeholders})`)
      .all(...ids) as Record<string, unknown>[];
    return rows.map(mapFile);
  }

  public getById(id: number): FileRecordDto {
    const row = this.db.prepare("SELECT * FROM files WHERE id=?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) {
      throw new Error("File not found");
    }
    return mapFile(row);
  }
}
