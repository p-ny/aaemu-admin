import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password_hash" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'admin',
        "created_at" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "servers" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "ip" TEXT NOT NULL,
        "port" INTEGER NOT NULL DEFAULT 1280,
        "mysql_host" TEXT,
        "mysql_port" INTEGER DEFAULT 3306,
        "mysql_user" TEXT,
        "mysql_password" TEXT,
        "mysql_database" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "command_history" (
        "id" SERIAL PRIMARY KEY,
        "server_id" INTEGER REFERENCES "servers"("id"),
        "command" TEXT NOT NULL,
        "response" TEXT,
        "status" TEXT,
        "timestamp" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "player_snapshots" (
        "id" SERIAL PRIMARY KEY,
        "server_id" INTEGER REFERENCES "servers"("id"),
        "player_count" INTEGER NOT NULL DEFAULT 0,
        "uptime" TEXT,
        "task_count" INTEGER,
        "timestamp" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "session" (
        "sid" VARCHAR NOT NULL PRIMARY KEY,
        "sess" JSON NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log("Database tables initialized successfully.");
  } finally {
    client.release();
  }
}
