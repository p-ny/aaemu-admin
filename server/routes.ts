import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "./db";
import { AAEmuClient } from "./aaemu-client";
import { GameServerMySQLClient } from "./mysql-client";
import * as sqliteClient from "./sqlite-client";
import { ensureDefaultAdmin, findUserByUsername, verifyPassword, createUser, hashPassword } from "./auth";
import {
  loginSchema,
  executeCommandSchema,
  insertServerSchema,
  sendMailSchema,
  auctionAddSchema,
  auctionGenerateSchema,
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    userId: number;
    username: string;
  }
}

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".sqlite3" || ext === ".sqlite" || ext === ".db") {
      cb(null, true);
    } else {
      cb(new Error("Only SQLite database files are allowed"));
    }
  },
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

async function getAAEmuClient(serverId: number): Promise<AAEmuClient | null> {
  const server = await storage.getServer(serverId);
  if (!server) return null;
  return new AAEmuClient(server.ip, server.port);
}

async function getMySQLClient(serverId: number): Promise<GameServerMySQLClient | null> {
  const server = await storage.getServer(serverId);
  if (!server || !server.mysqlHost || !server.mysqlUser || !server.mysqlDatabase) return null;
  return new GameServerMySQLClient({
    host: server.mysqlHost,
    port: server.mysqlPort || 3306,
    user: server.mysqlUser,
    password: server.mysqlPassword || "",
    database: server.mysqlDatabase,
  });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const PgStore = pgSession(session);
  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
        httpOnly: true,
      },
    })
  );

  await ensureDefaultAdmin();

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await findUserByUsername(username);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });

      req.session.authenticated = true;
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session save failed" });
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
      });
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/check", (req, res) => {
    res.json({
      authenticated: !!req.session.authenticated,
      user: req.session.authenticated
        ? { id: req.session.userId, username: req.session.username }
        : null,
    });
  });

  app.post("/api/auth/register", requireAuth, async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const existing = await findUserByUsername(username);
      if (existing) return res.status(400).json({ message: "Username already exists" });
      const user = await createUser(username, password);
      res.status(201).json({ id: user.id, username: user.username, role: user.role });
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Invalid request" });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Invalid password" });
      }
      const user = await findUserByUsername(req.session.username!);
      if (!user) return res.status(404).json({ message: "User not found" });

      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });

      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const newHash = await hashPassword(newPassword);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/users", requireAuth, async (_req, res) => {
    const allUsers = await storage.getUsers();
    res.json(allUsers.map((u) => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })));
  });

  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.session.userId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    await storage.deleteUser(id);
    res.json({ success: true });
  });

  app.get("/api/servers", requireAuth, async (_req, res) => {
    const serverList = await storage.getServers();
    const sanitized = serverList.map((s) => ({
      ...s,
      mysqlPassword: s.mysqlPassword ? "***" : null,
    }));
    res.json(sanitized);
  });

  app.post("/api/servers", requireAuth, async (req, res) => {
    try {
      const input = insertServerSchema.parse(req.body);
      const server = await storage.createServer(input);
      res.status(201).json(server);
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.put("/api/servers/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const server = await storage.updateServer(id, req.body);
      if (!server) return res.status(404).json({ message: "Server not found" });
      res.json(server);
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete("/api/servers/:id", requireAuth, async (req, res) => {
    await storage.deleteServer(Number(req.params.id));
    res.json({ success: true });
  });

  app.get("/api/servers/:id/test", requireAuth, async (req, res) => {
    const server = await storage.getServer(Number(req.params.id));
    if (!server) return res.status(404).json({ message: "Server not found" });

    const client = new AAEmuClient(server.ip, server.port);
    const status = await client.getStatus();
    res.json(status);
  });

  app.get("/api/servers/:id/test-mysql", requireAuth, async (req, res) => {
    const mysqlClient = await getMySQLClient(Number(req.params.id));
    if (!mysqlClient) return res.status(400).json({ success: false, message: "MySQL not configured for this server" });

    const result = await mysqlClient.testConnection();
    res.json(result);
  });

  app.get("/api/aaemu/status/:serverId", requireAuth, async (req, res) => {
    try {
      const client = await getAAEmuClient(Number(req.params.serverId));
      if (!client) return res.status(404).json({ message: "Server not found" });
      const status = await client.getStatus();
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/aaemu/characters/:serverId", requireAuth, async (req, res) => {
    try {
      const client = await getAAEmuClient(Number(req.params.serverId));
      if (!client) return res.status(404).json({ message: "Server not found" });
      const data = await client.getLoggedCharacters();
      res.json(data);
    } catch (e: any) {
      res.json([]);
    }
  });

  app.get("/api/aaemu/character-list/:serverId", requireAuth, async (req, res) => {
    try {
      const client = await getAAEmuClient(Number(req.params.serverId));
      if (!client) return res.status(404).json({ message: "Server not found" });
      const params: Record<string, string> = {};
      if (req.query.AccountId) params.AccountId = String(req.query.AccountId);
      if (req.query.Name) params.Name = String(req.query.Name);
      const data = await client.getCharacterList(params);
      res.json(data);
    } catch (e: any) {
      res.json([]);
    }
  });

  app.post("/api/aaemu/command", requireAuth, async (req, res) => {
    try {
      const { serverId, command, character, arguments: args } = executeCommandSchema.parse(req.body);
      const client = await getAAEmuClient(serverId);
      if (!client) return res.status(404).json({ message: "Server not found" });

      const parts = command.split(" ");
      const cmdName = parts[0];
      const inlineArgs = parts.slice(1).join(" ");
      const cmdArgs = inlineArgs || args || "";
      const charName = character || "";

      const finalArgs = charName
        ? (cmdArgs || charName)
        : (cmdArgs || cmdName);

      const result = await client.executeCommand(cmdName, charName || "", finalArgs);

      const loggedCommand = `${cmdName} ${cmdArgs}`.trim();

      await storage.logCommand({
        serverId,
        command: loggedCommand,
        response: JSON.stringify(result),
        status: "success",
      });

      res.json({ result: JSON.stringify(result), success: true });
    } catch (e: any) {
      console.error("[command] Error:", e.response?.data || e.message);
      const detail = e.response?.data?.Message || e.response?.data?.message || e.message;
      const sid = Number(req.body?.serverId);
      if (sid) {
        await storage.logCommand({
          serverId: sid,
          command: req.body.command || "unknown",
          response: detail || "Command failed",
          status: "error",
        }).catch(() => {});
      }
      res.status(500).json({ message: detail || "Command failed" });
    }
  });

  app.get("/api/aaemu/expeditions/:serverId", requireAuth, async (req, res) => {
    try {
      const client = await getAAEmuClient(Number(req.params.serverId));
      if (!client) return res.status(404).json({ message: "Server not found" });
      const data = await client.getExpeditions();
      res.json(data);
    } catch (e: any) {
      res.json([]);
    }
  });

  app.get("/api/aaemu/auction/list/:serverId", requireAuth, async (req, res) => {
    try {
      const client = await getAAEmuClient(Number(req.params.serverId));
      if (!client) return res.status(404).json({ message: "Server not found" });
      const data = await client.getAuctionList();
      res.json(data);
    } catch (e: any) {
      res.json({ items: [] });
    }
  });

  app.get("/api/aaemu/auction/search/:serverId", requireAuth, async (req, res) => {
    try {
      const client = await getAAEmuClient(Number(req.params.serverId));
      if (!client) return res.status(404).json({ message: "Server not found" });
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.query)) {
        if (v && k !== "serverId") params[k] = String(v);
      }
      const data = await client.searchAuction(params);
      res.json(data);
    } catch (e: any) {
      res.json({ items: [] });
    }
  });

  app.post("/api/aaemu/auction/add", requireAuth, async (req, res) => {
    try {
      const input = auctionAddSchema.parse(req.body);
      const client = await getAAEmuClient(input.serverId);
      if (!client) return res.status(404).json({ message: "Server not found" });
      const data = await client.addAuctionItem({
        ItemId: input.itemId,
        Quantity: input.quantity,
        Price: input.price,
        Duration: input.duration,
        ClientId: input.clientId,
        ClientName: input.clientName,
      });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/aaemu/auction/generate", requireAuth, async (req, res) => {
    try {
      const input = auctionGenerateSchema.parse(req.body);
      const client = await getAAEmuClient(input.serverId);
      if (!client) return res.status(404).json({ message: "Server not found" });
      const data = await client.generateAuctionItem({
        ItemTemplateId: input.itemTemplateId,
        Quantity: input.quantity,
        GradeId: input.gradeId,
        BuyNowPrice: input.buyNowPrice,
        StartPrice: input.startPrice,
        Duration: input.duration,
        ClientId: input.clientId,
        ClientName: input.clientName,
      });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/aaemu/mail/send", requireAuth, async (req, res) => {
    try {
      const input = sendMailSchema.parse(req.body);
      const client = await getAAEmuClient(input.serverId);
      if (!client) return res.status(404).json({ message: "Server not found" });

      const recipientTypeMap: Record<string, number> = {
        Character: 0, Expedition: 1, Family: 2, Online: 3, All: 4,
      };
      const recipientTypeNum = typeof input.recipientType === "string"
        ? recipientTypeMap[input.recipientType] ?? 0
        : input.recipientType;

      const data = await client.sendMail({
        SenderName: input.senderName,
        Title: input.title,
        Body: input.body,
        Recipients: input.recipients,
        RecipientType: recipientTypeNum,
        Type: input.type,
        Money: input.money,
        Billing: input.billing,
        AttachmentItems: input.attachmentItems.map((a) => ({ Id: a.id, Count: a.count })),
      });
      res.json(data);
    } catch (e: any) {
      console.error("[mail/send] Error:", e.response?.data || e.message);
      const detail = e.response?.data?.Message || e.response?.data?.message || e.message;
      res.status(500).json({ message: detail || "Failed to send mail" });
    }
  });

  app.post("/api/aaemu/mail/list", requireAuth, async (req, res) => {
    try {
      const { serverId, characterId } = req.body;
      const client = await getAAEmuClient(serverId);
      if (!client) return res.status(404).json({ message: "Server not found" });
      const data = await client.listMail(characterId);
      console.log("[mail/list] Raw AAEmu response:", JSON.stringify(data).substring(0, 2000));
      res.json(data);
    } catch (e: any) {
      console.error("[mail/list] Error:", e.message);
      res.status(500).json({ message: e.message || "Failed to fetch mail" });
    }
  });

  app.post("/api/aaemu/mail/delete", requireAuth, async (req, res) => {
    try {
      const { serverId, mailId, senderId, receiverId, trashItems } = req.body;
      const client = await getAAEmuClient(serverId);
      if (!client) return res.status(404).json({ message: "Server not found" });
      const data = await client.deleteMail(mailId, senderId, receiverId, trashItems);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/history/:serverId", requireAuth, async (req, res) => {
    const history = await storage.getCommandHistory(Number(req.params.serverId));
    res.json(history);
  });

  app.get("/api/cashshop/skus/:serverId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      const skus = await mysqlClient.getIcsSkus();
      res.json(skus);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/cashshop/skus/:serverId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      const id = await mysqlClient.createIcsSku(req.body);
      res.status(201).json({ id });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/cashshop/skus/:serverId/:skuId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      await mysqlClient.updateIcsSku(Number(req.params.skuId), req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/cashshop/skus/:serverId/:skuId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      await mysqlClient.deleteIcsSku(Number(req.params.skuId));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/cashshop/items/:serverId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      const items = await mysqlClient.getIcsShopItems();
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/cashshop/items/:serverId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      const id = await mysqlClient.createIcsShopItem(req.body);
      res.status(201).json({ id });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/cashshop/items/:serverId/:shopId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      await mysqlClient.updateIcsShopItem(Number(req.params.shopId), req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/cashshop/items/:serverId/:shopId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      await mysqlClient.deleteIcsShopItem(Number(req.params.shopId));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/cashshop/menu/:serverId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      const menu = await mysqlClient.getIcsMenu();
      res.json(menu);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/cashshop/menu/:serverId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      const id = await mysqlClient.createIcsMenuItem(req.body);
      res.status(201).json({ id });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/cashshop/menu/:serverId/:menuId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      await mysqlClient.updateIcsMenuItem(Number(req.params.menuId), req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/cashshop/menu/:serverId/:menuId", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      await mysqlClient.deleteIcsMenuItem(Number(req.params.menuId));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/cashshop/mysql-schema/:serverId/:table", requireAuth, async (req, res) => {
    try {
      const mysqlClient = await getMySQLClient(Number(req.params.serverId));
      if (!mysqlClient) return res.status(400).json({ message: "MySQL not configured" });
      const schema = await mysqlClient.getTableSchema(req.params.table as string);
      res.json(schema);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/compact/items", requireAuth, (req, res) => {
    const search = req.query.search as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const filename = req.query.filename as string | undefined;
    const data = sqliteClient.getItemsFromCompact(search, limit, offset, filename);
    res.json(data);
  });

  app.get("/api/compact/item/:id", requireAuth, (req, res) => {
    const filename = req.query.filename as string | undefined;
    const item = sqliteClient.getItemById(Number(req.params.id), filename);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.get("/api/compact/icon/:id", requireAuth, (req, res) => {
    const filename = req.query.filename as string | undefined;
    const icon = sqliteClient.getItemIcon(Number(req.params.id), filename);
    if (!icon) {
      res.status(404).json({ message: "Icon not found" });
      return;
    }
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(icon);
  });

  app.get("/api/compact/tables", requireAuth, (req, res) => {
    const filename = req.query.filename as string | undefined;
    const tables = sqliteClient.getCompactTables(filename);
    res.json(tables);
  });

  app.get("/api/compact/files", requireAuth, (_req, res) => {
    const files = sqliteClient.listUploadedCompactFiles();
    res.json(files);
  });

  app.get("/api/compact/exists", requireAuth, (req, res) => {
    const filename = req.query.filename as string | undefined;
    res.json({ exists: sqliteClient.compactDbExists(filename) });
  });

  app.post("/api/compact/upload", requireAuth, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const targetName = (req.body.filename || req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    const targetPath = sqliteClient.getCompactDbPath(targetName);
    fs.renameSync(req.file.path, targetPath);
    res.json({ success: true, filename: targetName });
  });

  app.delete("/api/compact/:filename", requireAuth, (req, res) => {
    const filePath = sqliteClient.getCompactDbPath(req.params.filename as string);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  app.get("/api/activity", requireAuth, async (_req, res) => {
    try {
      const activity = await storage.getRecentActivity(30);
      res.json(activity);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/stats/players/:serverId", requireAuth, async (req, res) => {
    try {
      const serverId = parseInt(req.params.serverId);
      const hours = parseInt(req.query.hours as string) || 24;
      const snapshots = await storage.getPlayerSnapshots(serverId, hours);
      res.json(snapshots);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  async function pollPlayerCounts() {
    try {
      const allServers = await storage.getServers();
      for (const server of allServers) {
        try {
          const client = new AAEmuClient(server.ip, server.port);
          const status = await client.getStatus();
          if (status.success) {
            const taskMatch = status.raw?.match(/TaskManager Jobs:\s*(\d+)/i);
            const taskCount = taskMatch ? parseInt(taskMatch[1]) : undefined;
            await storage.savePlayerSnapshot(server.id, status.players ?? 0, status.uptime, taskCount);
          }
        } catch {}
      }
      await storage.cleanOldSnapshots(72);
    } catch (e) {
      console.error("[poll] Error polling player counts:", e);
    }
  }

  pollPlayerCounts();
  setInterval(pollPlayerCounts, 5 * 60 * 1000);

  return httpServer;
}
