import { type User, type InsertUser, type QueryHistory, type InsertQueryHistory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getQueryHistory(username: string, limit?: number): Promise<QueryHistory[]>;
  addQueryHistory(history: InsertQueryHistory): Promise<QueryHistory>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private queryHistory: Map<string, QueryHistory>;

  constructor() {
    this.users = new Map();
    this.queryHistory = new Map();
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getQueryHistory(username: string, limit: number = 10): Promise<QueryHistory[]> {
    const userHistory = Array.from(this.queryHistory.values())
      .filter(history => history.username === username)
      .sort((a, b) => new Date(b.executedAt || 0).getTime() - new Date(a.executedAt || 0).getTime())
      .slice(0, limit);
    
    return userHistory;
  }

  async addQueryHistory(insertHistory: InsertQueryHistory): Promise<QueryHistory> {
    const id = randomUUID();
    const history: QueryHistory = {
      ...insertHistory,
      id,
      executedAt: new Date(),
      results: insertHistory.results || null,
    };
    this.queryHistory.set(id, history);
    return history;
  }
}

export const storage = new MemStorage();
