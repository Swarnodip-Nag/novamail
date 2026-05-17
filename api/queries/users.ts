import { eq } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import type { InsertUser } from "../../db/schema.js";
import { getDb } from "./connection.js";

export async function findUserById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findUserByEmail(email: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows.at(0);
}

export async function upsertUserByEmail(data: { email: string; name?: string; avatar?: string }): Promise<schema.User> {
  const existing = await findUserByEmail(data.email);

  if (existing) {
    const [updated] = await getDb()
      .update(schema.users)
      .set({ lastSignInAt: new Date() })
      .where(eq(schema.users.id, existing.id))
      .returning();
    return updated;
  }

  const insertData: InsertUser = {
    email: data.email,
    unionId: data.email, // reuse unionId as a compat field
    name: data.name ?? data.email.split("@")[0],
    avatar: data.avatar,
    lastSignInAt: new Date(),
  };

  const [created] = await getDb()
    .insert(schema.users)
    .values(insertData)
    .returning();

  return created;
}
