import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.resolve("uploads");

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function getCompactDbPath(filename?: string): string {
  ensureUploadDir();
  return path.join(UPLOAD_DIR, filename || "compact.sqlite3");
}

export function compactDbExists(filename?: string): boolean {
  return fs.existsSync(getCompactDbPath(filename));
}

export function getCompactDb(filename?: string): Database.Database | null {
  const dbPath = getCompactDbPath(filename);
  if (!fs.existsSync(dbPath)) return null;
  return new Database(dbPath, { readonly: true });
}

function getItemTableName(db: Database.Database): string | null {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as any[];
  const tableNames = tables.map((t) => t.name);
  if (tableNames.includes("items")) return "items";
  if (tableNames.includes("item_templates")) return "item_templates";
  return null;
}

export function getItemsFromCompact(
  search?: string,
  limit: number = 100,
  offset: number = 0,
  filename?: string
): { items: any[]; total: number } {
  const db = getCompactDb(filename);
  if (!db) return { items: [], total: 0 };

  try {
    const tableName = getItemTableName(db);
    if (!tableName) return { items: [], total: 0 };

    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const colNames = columns.map((c: any) => c.name.toLowerCase());

    const selectCols: string[] = ["id"];
    if (colNames.includes("name")) selectCols.push("name");
    if (colNames.includes("icon_id")) selectCols.push("icon_id");
    if (colNames.includes("category_id")) selectCols.push("category_id");
    if (colNames.includes("level")) selectCols.push("level");
    if (colNames.includes("description")) selectCols.push("description");
    if (colNames.includes("price")) selectCols.push("price");
    if (colNames.includes("refund")) selectCols.push("refund");
    if (colNames.includes("max_stack_size")) selectCols.push("max_stack_size");
    if (colNames.includes("fixed_grade")) selectCols.push("fixed_grade");
    if (colNames.includes("level_requirement")) selectCols.push("level_requirement");
    if (colNames.includes("bind_id")) selectCols.push("bind_id");
    if (colNames.includes("sellable")) selectCols.push("sellable");

    let countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
    let dataQuery = `SELECT ${selectCols.join(", ")} FROM ${tableName}`;
    const params: any[] = [];

    if (search) {
      const hasName = colNames.includes("name");
      if (hasName) {
        countQuery += " WHERE name LIKE ? OR CAST(id AS TEXT) LIKE ?";
        dataQuery += " WHERE name LIKE ? OR CAST(id AS TEXT) LIKE ?";
        params.push(`%${search}%`, `%${search}%`);
      } else {
        countQuery += " WHERE CAST(id AS TEXT) LIKE ?";
        dataQuery += " WHERE CAST(id AS TEXT) LIKE ?";
        params.push(`%${search}%`);
      }
    }

    dataQuery += " ORDER BY id LIMIT ? OFFSET ?";

    const countResult = db.prepare(countQuery).get(...params) as any;
    const total = countResult?.total || 0;

    const items = db.prepare(dataQuery).all(...params, limit, offset);
    return { items, total };
  } catch (e: any) {
    console.error("SQLite query error:", e.message);
    return { items: [], total: 0 };
  } finally {
    db.close();
  }
}

export function getItemById(itemId: number, filename?: string): any | null {
  const db = getCompactDb(filename);
  if (!db) return null;

  try {
    const tableName = getItemTableName(db);
    if (!tableName) return null;
    const item = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(itemId);
    return item || null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export function getItemIcon(iconId: number, filename?: string): Buffer | null {
  const db = getCompactDb(filename);
  if (!db) return null;

  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as any[];
    const tableNames = tables.map((t: any) => t.name);

    for (const tableName of ["icons", "item_icons"]) {
      if (!tableNames.includes(tableName)) continue;
      try {
        const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
        const colNames = columns.map((c: any) => c.name.toLowerCase());

        if (colNames.includes("data") || colNames.includes("icon")) {
          const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(iconId) as any;
          if (row?.data && Buffer.isBuffer(row.data)) return row.data;
          if (row?.icon && Buffer.isBuffer(row.icon)) return row.icon;
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export function getCompactTables(filename?: string): string[] {
  const db = getCompactDb(filename);
  if (!db) return [];

  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as any[];
    return tables.map((t) => t.name);
  } finally {
    db.close();
  }
}

export function listUploadedCompactFiles(): string[] {
  ensureUploadDir();
  return fs.readdirSync(UPLOAD_DIR).filter((f) => f.endsWith(".sqlite3") || f.endsWith(".sqlite"));
}
