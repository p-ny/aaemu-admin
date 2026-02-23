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

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    const tableNames = tables.map(t => t.name.toLowerCase());
    const hasLocalized = tableNames.includes("localized_texts");

    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const colNames = columns.map((c: any) => c.name.toLowerCase());

    const hasIconsTable = tableNames.includes("icons");
    let selectCols: string[] = [`t.id`];
    if (colNames.includes("name")) selectCols.push(`t.name`);
    if (colNames.includes("icon_id")) selectCols.push(`t.icon_id`);
    if (colNames.includes("description")) selectCols.push(`t.description`);
    if (hasIconsTable && colNames.includes("icon_id")) selectCols.push(`ic.filename as icon_filename`);

    // If localized_texts exists, we'll try to join it for English names
    let query = "";
    let countQuery = "";
    const params: any[] = [];

    if (hasLocalized) {
      // localized_texts uses per-language columns (e.g. en_us), joined on idx
      const localizedCols = db.prepare("PRAGMA table_info(localized_texts)").all() as any[];
      const localizedColNames = localizedCols.map((c: any) => c.name.toLowerCase());
      const enCol = localizedColNames.includes("en_us") ? "en_us" : (localizedColNames.includes("en") ? "en" : null);

      const iconJoin = hasIconsTable && colNames.includes("icon_id") ? ` LEFT JOIN icons ic ON t.icon_id = ic.id` : "";
      if (enCol) {
        selectCols.push(`l.${enCol} as localized_name`);
        query = `SELECT ${selectCols.join(", ")} FROM ${tableName} t LEFT JOIN localized_texts l ON t.id = l.idx${iconJoin}`;
        countQuery = `SELECT COUNT(*) as total FROM ${tableName} t LEFT JOIN localized_texts l ON t.id = l.idx${iconJoin}`;
      } else {
        query = `SELECT ${selectCols.join(", ")} FROM ${tableName} t${iconJoin}`;
        countQuery = `SELECT COUNT(*) as total FROM ${tableName} t${iconJoin}`;
      }
    } else {
      const iconJoin = hasIconsTable && colNames.includes("icon_id") ? ` LEFT JOIN icons ic ON t.icon_id = ic.id` : "";
      query = `SELECT ${selectCols.join(", ")} FROM ${tableName} t${iconJoin}`;
      countQuery = `SELECT COUNT(*) as total FROM ${tableName} t${iconJoin}`;
    }

    // Re-check whether localized join was actually set up
    const hasLocalizedJoin = hasLocalized && query.includes("LEFT JOIN localized_texts");
    // Get the en column name used above (if any) for search
    let enSearchCol: string | null = null;
    if (hasLocalizedJoin) {
      const localizedCols2 = db.prepare("PRAGMA table_info(localized_texts)").all() as any[];
      const lc = localizedCols2.map((c: any) => c.name.toLowerCase());
      enSearchCol = lc.includes("en_us") ? "en_us" : (lc.includes("en") ? "en" : null);
    }

    if (search) {
      const searchTerms = [`CAST(t.id AS TEXT) LIKE ?`];
      params.push(`%${search}%`);
      
      if (colNames.includes("name")) {
        searchTerms.push(`t.name LIKE ?`);
        params.push(`%${search}%`);
      }
      if (hasLocalizedJoin && enSearchCol) {
        searchTerms.push(`l.${enSearchCol} LIKE ?`);
        params.push(`%${search}%`);
      }
      
      const where = ` WHERE ${searchTerms.join(" OR ")}`;
      query += where;
      countQuery += where;
    }

    const totalResult = db.prepare(countQuery).get(...params) as any;
    const total = totalResult?.total || 0;

    query += " ORDER BY t.id LIMIT ? OFFSET ?";
    const items = db.prepare(query).all(...params, limit, offset);

    // Map localized name and clean up icon filename
    const mappedItems = items.map((item: any) => ({
      ...item,
      name: item.localized_name || item.name || `Item ${item.id}`,
      icon_filename: item.icon_filename ? item.icon_filename.replace(/\.dds$/i, "") : null
    }));

    return { items: mappedItems, total };
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

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    const tableNames = tables.map((t: any) => t.name.toLowerCase());
    const hasIcons = tableNames.includes("icons");

    let query: string;
    if (hasIcons) {
      query = `SELECT t.*, ic.filename as icon_filename FROM ${tableName} t LEFT JOIN icons ic ON t.icon_id = ic.id WHERE t.id = ?`;
    } else {
      query = `SELECT * FROM ${tableName} t WHERE t.id = ?`;
    }

    const item = db.prepare(query).get(itemId) as any;
    if (!item) return null;
    if (item.icon_filename) item.icon_filename = item.icon_filename.replace(/\.dds$/i, "");
    return item;
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
