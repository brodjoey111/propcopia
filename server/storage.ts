import { type User, type InsertUser, type UpdateUserProfile, users } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, profile: UpdateUserProfile): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      bio: null,
      profilePicture: null,
      globalPositionScaling: 100,
      globalMaxContracts: null,
      globalBlockedTickers: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserProfile(id: string, profile: UpdateUserProfile): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }
    const updatedUser: User = {
      ...user,
      bio: profile.bio !== undefined ? profile.bio : user.bio,
      profilePicture: profile.profilePicture !== undefined ? profile.profilePicture : user.profilePicture,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserProfile(id: string, profile: UpdateUserProfile): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(profile)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DbStorage();
