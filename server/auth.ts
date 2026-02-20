import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(username: string, password: string, role: string = "admin") {
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ username, passwordHash, role })
    .returning();
  return user;
}

export async function findUserByUsername(username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user || null;
}

export async function ensureDefaultAdmin() {
  const existing = await findUserByUsername("admin");
  if (!existing) {
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "changeme123";
    await createUser("admin", defaultPassword, "admin");
    console.log(`Default admin user created (username: admin, password: ${defaultPassword}). Change this immediately!`);
  }
}
