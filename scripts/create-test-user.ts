import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function createTestUser() {
  const username = "jbrod111";
  const password = "Flordia2025!";

  try {
    const existingUser = await db.select().from(users).where(eq(users.username, username));
    
    if (existingUser.length > 0) {
      console.log(`User ${username} already exists. Updating password...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, username));
      console.log(`Password updated for user: ${username}`);
    } else {
      console.log(`Creating user: ${username}`);
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db.insert(users).values({
        username,
        password: hashedPassword,
      }).returning();
      console.log(`User created successfully:`, result[0]);
    }
  } catch (error) {
    console.error("Error creating test user:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

createTestUser();
