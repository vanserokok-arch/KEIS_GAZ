import type Database from "better-sqlite3";
import type { ContractDto, ContractStatus } from "../../../shared/types";
import { timestamps } from "../app-db";

function mapContract(row: Record<string, unknown>): ContractDto {
  return {
    id: Number(row.id),
    clientId: Number(row.client_id),
    contractNumber: String(row.contract_number),
    amount: Number(row.amount),
    status: row.status as ContractStatus,
    casePath: row.case_path == null ? null : String(row.case_path),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export class ContractsRepo {
  public constructor(private readonly db: Database.Database) {}

  public list(input: { search: string; status?: ContractStatus }): ContractDto[] {
    const like = `%${input.search}%`;
    const rows = this.db
      .prepare(
        `SELECT * FROM contracts
         WHERE (? = '' OR contract_number LIKE ?)
           AND (? IS NULL OR status = ?)
         ORDER BY updated_at DESC, id DESC`
      )
      .all(input.search, like, input.status ?? null, input.status ?? null) as Record<
      string,
      unknown
    >[];
    return rows.map(mapContract);
  }

  public create(input: { clientId: number; contractNumber: string; amount: number }): ContractDto {
    const ts = timestamps();
    const result = this.db
      .prepare(
        `INSERT INTO contracts
        (client_id, contract_number, amount, status, case_path, created_at, updated_at)
        VALUES (?, ?, ?, 'draft', NULL, ?, ?)`
      )
      .run(input.clientId, input.contractNumber, input.amount, ts.createdAt, ts.updatedAt);
    return this.getById(Number(result.lastInsertRowid));
  }

  public updateStatus(id: number, status: ContractStatus): ContractDto {
    const updatedAt = new Date().toISOString();
    const info = this.db
      .prepare("UPDATE contracts SET status=?, updated_at=? WHERE id=?")
      .run(status, updatedAt, id);
    if (info.changes < 1) {
      throw new Error("Contract not found");
    }
    return this.getById(id);
  }

  public updateCasePath(id: number, casePath: string): void {
    this.db
      .prepare("UPDATE contracts SET case_path=?, updated_at=? WHERE id=?")
      .run(casePath, new Date().toISOString(), id);
  }

  public getById(id: number): ContractDto {
    const row = this.db.prepare("SELECT * FROM contracts WHERE id=?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) {
      throw new Error("Contract not found");
    }
    return mapContract(row);
  }
}
