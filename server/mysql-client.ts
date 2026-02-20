import mysql from "mysql2/promise";

export interface GameServerDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export class GameServerMySQLClient {
  private config: GameServerDbConfig;

  constructor(config: GameServerDbConfig) {
    this.config = config;
  }

  private async getConnection() {
    return mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const conn = await this.getConnection();
      await conn.ping();
      await conn.end();
      return { success: true, message: "Connected successfully" };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async getIcsSkus(): Promise<any[]> {
    const conn = await this.getConnection();
    try {
      // Try to find if columns exist by selecting 1 row
      const [rows] = await conn.execute("SELECT * FROM ics_skus LIMIT 1");
      const data = rows as any[];
      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        const orderCol = columns.includes('sku_id') ? 'sku_id' : (columns.includes('id') ? 'id' : null);
        const query = orderCol ? `SELECT * FROM ics_skus ORDER BY ${orderCol}` : "SELECT * FROM ics_skus";
        const [allRows] = await conn.execute(query);
        return allRows as any[];
      }
      return [];
    } catch (e) {
      const [rows] = await conn.execute("SELECT * FROM ics_skus");
      return rows as any[];
    } finally {
      await conn.end();
    }
  }

  async getIcsSku(skuId: number): Promise<any> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute("SELECT * FROM ics_skus LIMIT 1");
      const data = rows as any[];
      const idCol = (data.length > 0 && Object.keys(data[0]).includes('sku_id')) ? 'sku_id' : 'id';
      const [result] = await conn.execute(`SELECT * FROM ics_skus WHERE ${idCol} = ?`, [skuId]);
      return (result as any[])[0];
    } finally {
      await conn.end();
    }
  }

  async updateIcsSku(skuId: number, data: Record<string, any>): Promise<void> {
    const conn = await this.getConnection();
    try {
      const [sample] = await conn.execute("SELECT * FROM ics_skus LIMIT 1");
      const columns = Object.keys((sample as any[])[0] || {});
      const idCol = columns.includes('sku_id') ? 'sku_id' : 'id';
      
      const cleanData = { ...data };
      // Map frontend fields to backend if needed
      if (columns.includes('item_id') && data.item_template_id !== undefined) {
        cleanData.item_id = data.item_template_id;
        delete cleanData.item_template_id;
      }

      const fields = Object.keys(cleanData).filter(f => columns.includes(f));
      const setClause = fields.map(f => `\`${f}\` = ?`).join(", ");
      await conn.execute(`UPDATE ics_skus SET ${setClause} WHERE ${idCol} = ?`, [...fields.map(f => cleanData[f]), skuId]);
    } finally {
      await conn.end();
    }
  }

  async createIcsSku(data: Record<string, any>): Promise<number> {
    const conn = await this.getConnection();
    try {
      const [sample] = await conn.execute("SELECT * FROM ics_skus LIMIT 1");
      const columns = Object.keys((sample as any[])[0] || {});
      
      const cleanData = { ...data };
      delete cleanData.sku_id;
      delete cleanData.id;

      if (columns.includes('item_id') && data.item_template_id !== undefined) {
        cleanData.item_id = data.item_template_id;
        delete cleanData.item_template_id;
      }

      const fields = Object.keys(cleanData).filter(f => columns.includes(f));
      const placeholders = fields.map(() => "?").join(", ");
      const [result] = await conn.execute(
        `INSERT INTO ics_skus (${fields.map(f => `\`${f}\``).join(", ")}) VALUES (${placeholders})`,
        fields.map(f => cleanData[f])
      );
      return (result as any).insertId;
    } finally {
      await conn.end();
    }
  }

  async deleteIcsSku(skuId: number): Promise<void> {
    const conn = await this.getConnection();
    try {
      const [sample] = await conn.execute("SELECT * FROM ics_skus LIMIT 1");
      const idCol = Object.keys((sample as any[])[0] || {}).includes('sku_id') ? 'sku_id' : 'id';
      await conn.execute(`DELETE FROM ics_skus WHERE ${idCol} = ?`, [skuId]);
    } finally {
      await conn.end();
    }
  }

  async getIcsShopItems(): Promise<any[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute("SELECT * FROM ics_shop_items LIMIT 1");
      const data = rows as any[];
      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        const orderCol = columns.includes('shop_id') ? 'shop_id' : (columns.includes('id') ? 'id' : null);
        const query = orderCol ? `SELECT * FROM ics_shop_items ORDER BY ${orderCol}` : "SELECT * FROM ics_shop_items";
        const [allRows] = await conn.execute(query);
        return allRows as any[];
      }
      return [];
    } catch {
      const [rows] = await conn.execute("SELECT * FROM ics_shop_items");
      return rows as any[];
    } finally {
      await conn.end();
    }
  }

  async updateIcsShopItem(shopId: number, data: Record<string, any>): Promise<void> {
    const conn = await this.getConnection();
    try {
      const [sample] = await conn.execute("SELECT * FROM ics_shop_items LIMIT 1");
      const columns = Object.keys((sample as any[])[0] || {});
      const idCol = columns.includes('shop_id') ? 'shop_id' : 'id';

      const cleanData = { ...data };
      // Map display_order if needed, though usually it's correct or missing
      const fields = Object.keys(cleanData).filter(f => columns.includes(f));
      const setClause = fields.map(f => `\`${f}\` = ?`).join(", ");
      await conn.execute(`UPDATE ics_shop_items SET ${setClause} WHERE ${idCol} = ?`, [...fields.map(f => cleanData[f]), shopId]);
    } finally {
      await conn.end();
    }
  }

  async createIcsShopItem(data: Record<string, any>): Promise<number> {
    const conn = await this.getConnection();
    try {
      const [sample] = await conn.execute("SELECT * FROM ics_shop_items LIMIT 1");
      const columns = Object.keys((sample as any[])[0] || {});

      const cleanData = { ...data };
      delete cleanData.shop_id;
      delete cleanData.id;

      const fields = Object.keys(cleanData).filter(f => columns.includes(f));
      const placeholders = fields.map(() => "?").join(", ");
      const [result] = await conn.execute(
        `INSERT INTO ics_shop_items (${fields.map(f => `\`${f}\``).join(", ")}) VALUES (${placeholders})`,
        fields.map(f => cleanData[f])
      );
      return (result as any).insertId;
    } finally {
      await conn.end();
    }
  }

  async deleteIcsShopItem(shopId: number): Promise<void> {
    const conn = await this.getConnection();
    try {
      const [sample] = await conn.execute("SELECT * FROM ics_shop_items LIMIT 1");
      const idCol = Object.keys((sample as any[])[0] || {}).includes('shop_id') ? 'shop_id' : 'id';
      await conn.execute(`DELETE FROM ics_shop_items WHERE ${idCol} = ?`, [shopId]);
    } finally {
      await conn.end();
    }
  }

  async getIcsMenu(): Promise<any[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute("SELECT * FROM ics_menu ORDER BY id");
      return rows as any[];
    } finally {
      await conn.end();
    }
  }

  async updateIcsMenuItem(id: number, data: Record<string, any>): Promise<void> {
    const conn = await this.getConnection();
    try {
      const [sample] = await conn.execute("SELECT * FROM ics_menu LIMIT 1");
      const columns = Object.keys((sample as any[])[0] || {});

      const cleanData = { ...data };
      if (columns.includes('name') && data.tab_name !== undefined) {
        cleanData.name = data.tab_name;
      }

      const fields = Object.keys(cleanData).filter(f => columns.includes(f));
      const setClause = fields.map(f => `\`${f}\` = ?`).join(", ");
      await conn.execute(`UPDATE ics_menu SET ${setClause} WHERE id = ?`, [...fields.map(f => cleanData[f]), id]);
    } finally {
      await conn.end();
    }
  }

  async createIcsMenuItem(data: Record<string, any>): Promise<number> {
    const conn = await this.getConnection();
    try {
      const [sample] = await conn.execute("SELECT * FROM ics_menu LIMIT 1");
      const columns = Object.keys((sample as any[])[0] || {});

      const cleanData = { ...data };
      delete cleanData.id;
      
      if (columns.includes('name') && data.tab_name !== undefined) {
        cleanData.name = data.tab_name;
      }

      const fields = Object.keys(cleanData).filter(f => columns.includes(f));
      const placeholders = fields.map(() => "?").join(", ");
      const [result] = await conn.execute(
        `INSERT INTO ics_menu (${fields.map(f => `\`${f}\``).join(", ")}) VALUES (${placeholders})`,
        fields.map(f => cleanData[f])
      );
      return (result as any).insertId;
    } finally {
      await conn.end();
    }
  }

  async deleteIcsMenuItem(id: number): Promise<void> {
    const conn = await this.getConnection();
    try {
      await conn.execute("DELETE FROM ics_menu WHERE id = ?", [id]);
    } finally {
      await conn.end();
    }
  }

  async getTableSchema(tableName: string): Promise<any[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute(`DESCRIBE \`${tableName}\``);
      return rows as any[];
    } catch {
      return [];
    } finally {
      await conn.end();
    }
  }
}
