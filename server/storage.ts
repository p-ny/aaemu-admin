import { servers, commandHistory, users, playerSnapshots, type InsertServer, type Server, type InsertCommandHistory, type CommandHistory, type User, type PlayerSnapshot } from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and, sql } from "drizzle-orm";

export interface IStorage {
  getServers(): Promise<Server[]>;
  getServer(id: number): Promise<Server | undefined>;
  createServer(server: InsertServer): Promise<Server>;
  updateServer(id: number, data: Partial<InsertServer>): Promise<Server | undefined>;
  deleteServer(id: number): Promise<void>;
  logCommand(cmd: InsertCommandHistory): Promise<CommandHistory>;
  getCommandHistory(serverId: number, limit?: number): Promise<CommandHistory[]>;
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getServers(): Promise<Server[]> {
    return await db.select().from(servers).orderBy(desc(servers.createdAt));
  }

  async getServer(id: number): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    return server;
  }

  async createServer(insertServer: InsertServer): Promise<Server> {
    const [server] = await db.insert(servers).values(insertServer).returning();
    return server;
  }

  async updateServer(id: number, data: Partial<InsertServer>): Promise<Server | undefined> {
    const [server] = await db.update(servers).set(data).where(eq(servers.id, id)).returning();
    return server;
  }

  async deleteServer(id: number): Promise<void> {
    await db.delete(commandHistory).where(eq(commandHistory.serverId, id));
    await db.delete(servers).where(eq(servers.id, id));
  }

  async logCommand(insertCmd: InsertCommandHistory): Promise<CommandHistory> {
    const [entry] = await db.insert(commandHistory).values(insertCmd).returning();
    return entry;
  }

  async getCommandHistory(serverId: number, limit: number = 50): Promise<CommandHistory[]> {
    return await db
      .select()
      .from(commandHistory)
      .where(eq(commandHistory.serverId, serverId))
      .orderBy(desc(commandHistory.timestamp))
      .limit(limit);
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async savePlayerSnapshot(serverId: number, playerCount: number, uptime?: string, taskCount?: number): Promise<void> {
    await db.insert(playerSnapshots).values({ serverId, playerCount, uptime, taskCount });
  }

  async getPlayerSnapshots(serverId: number, hours: number = 24): Promise<PlayerSnapshot[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await db.select().from(playerSnapshots)
      .where(and(eq(playerSnapshots.serverId, serverId), gte(playerSnapshots.timestamp, since)))
      .orderBy(playerSnapshots.timestamp);
  }

  async getRecentActivity(limit: number = 20): Promise<CommandHistory[]> {
    return await db.select().from(commandHistory)
      .orderBy(desc(commandHistory.timestamp))
      .limit(limit);
  }

  async cleanOldSnapshots(retainHours: number = 72): Promise<void> {
    const cutoff = new Date(Date.now() - retainHours * 60 * 60 * 1000);
    await db.delete(playerSnapshots).where(
      sql`${playerSnapshots.timestamp} < ${cutoff}`
    );
  }
}

export const storage = new DatabaseStorage();
