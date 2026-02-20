import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ip: text("ip").notNull(),
  port: integer("port").notNull().default(1280),
  mysqlHost: text("mysql_host"),
  mysqlPort: integer("mysql_port").default(3306),
  mysqlUser: text("mysql_user"),
  mysqlPassword: text("mysql_password"),
  mysqlDatabase: text("mysql_database"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commandHistory = pgTable("command_history", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").references(() => servers.id),
  command: text("command").notNull(),
  response: text("response"),
  status: text("status"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertServerSchema = createInsertSchema(servers).omit({
  id: true,
  createdAt: true,
});

export const playerSnapshots = pgTable("player_snapshots", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").references(() => servers.id),
  playerCount: integer("player_count").notNull().default(0),
  uptime: text("uptime"),
  taskCount: integer("task_count"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertCommandHistorySchema = createInsertSchema(commandHistory).omit({
  id: true,
  timestamp: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Server = typeof servers.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type CommandHistory = typeof commandHistory.$inferSelect;
export type InsertCommandHistory = z.infer<typeof insertCommandHistorySchema>;
export type PlayerSnapshot = typeof playerSnapshots.$inferSelect;

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const executeCommandSchema = z.object({
  serverId: z.number(),
  command: z.string().min(1, "Command cannot be empty"),
  character: z.string().optional(),
  arguments: z.string().optional(),
});

export const sendMailSchema = z.object({
  serverId: z.coerce.number(),
  senderName: z.string().optional().default("GM"),
  title: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.coerce.number()),
  recipientType: z.union([
    z.enum(["Character", "Expedition", "Family", "Online", "All"]),
    z.coerce.number().min(0).max(4),
  ]).default("Character"),
  type: z.coerce.number().default(0),
  money: z.coerce.number().default(0),
  billing: z.coerce.number().default(0),
  attachmentItems: z.array(z.object({
    id: z.coerce.number(),
    count: z.coerce.number().default(1),
  })).default([]),
});

export const auctionAddSchema = z.object({
  serverId: z.number(),
  itemId: z.number(),
  quantity: z.number(),
  price: z.number(),
  duration: z.number(),
  clientId: z.number(),
  clientName: z.string(),
});

export const auctionGenerateSchema = z.object({
  serverId: z.number(),
  itemTemplateId: z.number(),
  quantity: z.number(),
  gradeId: z.number().default(0),
  buyNowPrice: z.number(),
  startPrice: z.number(),
  duration: z.number(),
  clientId: z.number(),
  clientName: z.string(),
});

export const gameServerConnectionSchema = z.object({
  host: z.string().min(1),
  port: z.number().default(3306),
  user: z.string().min(1),
  password: z.string(),
  database: z.string().min(1),
});
