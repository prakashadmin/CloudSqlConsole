import { type Connection, type InsertConnection, type Query, type InsertQuery, type QueryResult, connections, queries, queryResults } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  // Connection methods
  getConnections(): Promise<Connection[]>;
  getConnection(id: string): Promise<Connection | undefined>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(id: string, connection: Partial<InsertConnection>): Promise<Connection | undefined>;
  deleteConnection(id: string): Promise<boolean>;
  setActiveConnection(id: string): Promise<void>;

  // Query methods
  getQueries(connectionId?: string): Promise<Query[]>;
  getQuery(id: string): Promise<Query | undefined>;
  createQuery(query: InsertQuery): Promise<Query>;
  updateQuery(id: string, query: Partial<InsertQuery>): Promise<Query | undefined>;
  deleteQuery(id: string): Promise<boolean>;

  // Query result methods
  saveQueryResult(queryId: string, result: any): Promise<QueryResult>;
  getQueryResult(id: string): Promise<QueryResult | undefined>;
  getQueryResultByQueryId(queryId: string): Promise<QueryResult | undefined>;
  
  // Query history methods
  getQueryHistory(connectionId?: string, limit?: number): Promise<Query[]>;
}

class MemStorage implements IStorage {
  private connections: Map<string, Connection>;
  private queries: Map<string, Query>;
  private queryResults: Map<string, QueryResult>;

  constructor() {
    this.connections = new Map();
    this.queries = new Map();
    this.queryResults = new Map();

    // Add default connections from environment variables if available
    this.initializeDefaultConnections();
  }

  private initializeDefaultConnections() {
    const pgConnection = {
      name: 'PostgreSQL Database',
      type: 'postgresql',
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || 'postgres',
      username: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      ssl: true, // Enable SSL for PostgreSQL by default
      isActive: true,
    };

    if (process.env.PGHOST) {
      this.createConnection(pgConnection).catch(console.error);
    }
  }

  async getConnections(): Promise<Connection[]> {
    return Array.from(this.connections.values());
  }

  async getConnection(id: string): Promise<Connection | undefined> {
    return this.connections.get(id);
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const id = randomUUID();
    const connection: Connection = {
      ...insertConnection,
      id,
      ssl: insertConnection.ssl ?? false,
      isActive: insertConnection.isActive ?? false,
      createdAt: new Date(),
    };
    this.connections.set(id, connection);
    return connection;
  }

  async updateConnection(id: string, updateData: Partial<InsertConnection>): Promise<Connection | undefined> {
    const existing = this.connections.get(id);
    if (!existing) return undefined;

    const updated: Connection = { ...existing, ...updateData };
    this.connections.set(id, updated);
    return updated;
  }

  async deleteConnection(id: string): Promise<boolean> {
    return this.connections.delete(id);
  }

  async setActiveConnection(id: string): Promise<void> {
    // Set all connections to inactive
    const connections = Array.from(this.connections.values());
    for (const connection of connections) {
      this.connections.set(connection.id, { ...connection, isActive: false });
    }
    
    // Set the specified connection to active
    const connection = this.connections.get(id);
    if (connection) {
      this.connections.set(id, { ...connection, isActive: true });
    }
  }

  async getQueries(connectionId?: string): Promise<Query[]> {
    const allQueries = Array.from(this.queries.values());
    if (connectionId) {
      return allQueries.filter(q => q.connectionId === connectionId);
    }
    return allQueries;
  }

  async getQuery(id: string): Promise<Query | undefined> {
    return this.queries.get(id);
  }

  async createQuery(insertQuery: InsertQuery): Promise<Query> {
    const id = randomUUID();
    const query: Query = {
      ...insertQuery,
      id,
      connectionId: insertQuery.connectionId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.queries.set(id, query);
    return query;
  }

  async updateQuery(id: string, updateData: Partial<InsertQuery>): Promise<Query | undefined> {
    const existing = this.queries.get(id);
    if (!existing) return undefined;

    const updated: Query = { 
      ...existing, 
      ...updateData,
      updatedAt: new Date(),
    };
    this.queries.set(id, updated);
    return updated;
  }

  async deleteQuery(id: string): Promise<boolean> {
    return this.queries.delete(id);
  }

  async saveQueryResult(queryId: string, result: any): Promise<QueryResult> {
    const id = randomUUID();
    const queryResult: QueryResult = {
      id,
      queryId,
      data: result.data,
      columns: result.columns,
      executionTime: result.executionTime,
      rowCount: result.rowCount,
      createdAt: new Date(),
    };
    this.queryResults.set(id, queryResult);
    return queryResult;
  }

  async getQueryResult(id: string): Promise<QueryResult | undefined> {
    return this.queryResults.get(id);
  }

  async getQueryResultByQueryId(queryId: string): Promise<QueryResult | undefined> {
    const results = Array.from(this.queryResults.values());
    return results.find(result => result.queryId === queryId);
  }

  async getQueryHistory(connectionId?: string, limit: number = 50): Promise<Query[]> {
    const allQueries = Array.from(this.queries.values());
    let filtered = connectionId 
      ? allQueries.filter(q => q.connectionId === connectionId)
      : allQueries;
    
    // Sort by creation date (most recent first) and limit
    return filtered
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }
}

export class PostgreSQLStorage implements IStorage {
  constructor() {
    // Initialize default connections on startup
    this.initializeDefaultConnections();
  }

  private async initializeDefaultConnections() {
    try {
      // Check if default PostgreSQL connection exists
      const existingConnections = await this.getConnections();
      const hasDefaultPG = existingConnections.some(conn => 
        conn.name === 'PostgreSQL Database' && conn.type === 'postgresql'
      );

      if (!hasDefaultPG && process.env.PGHOST) {
        const pgConnection = {
          name: 'PostgreSQL Database',
          type: 'postgresql',
          host: process.env.PGHOST || 'localhost',
          port: parseInt(process.env.PGPORT || '5432'),
          database: process.env.PGDATABASE || 'postgres',
          username: process.env.PGUSER || 'postgres',
          password: process.env.PGPASSWORD || '',
          ssl: true,
          isActive: true,
        };
        await this.createConnection(pgConnection);
      }
    } catch (error) {
      console.error('Failed to initialize default connections:', error);
    }
  }

  async getConnections(): Promise<Connection[]> {
    return await db.select().from(connections);
  }

  async getConnection(id: string): Promise<Connection | undefined> {
    const result = await db.select().from(connections).where(eq(connections.id, id));
    return result[0];
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const result = await db.insert(connections).values(insertConnection).returning();
    return result[0];
  }

  async updateConnection(id: string, updateData: Partial<InsertConnection>): Promise<Connection | undefined> {
    const result = await db.update(connections)
      .set(updateData)
      .where(eq(connections.id, id))
      .returning();
    return result[0];
  }

  async deleteConnection(id: string): Promise<boolean> {
    const result = await db.delete(connections).where(eq(connections.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async setActiveConnection(id: string): Promise<void> {
    // Set all connections to inactive
    await db.update(connections).set({ isActive: false });
    
    // Set the specified connection to active
    await db.update(connections)
      .set({ isActive: true })
      .where(eq(connections.id, id));
  }

  async getQueries(connectionId?: string): Promise<Query[]> {
    if (connectionId) {
      return await db.select().from(queries).where(eq(queries.connectionId, connectionId));
    }
    return await db.select().from(queries);
  }

  async getQuery(id: string): Promise<Query | undefined> {
    const result = await db.select().from(queries).where(eq(queries.id, id));
    return result[0];
  }

  async createQuery(insertQuery: InsertQuery): Promise<Query> {
    const result = await db.insert(queries).values(insertQuery).returning();
    return result[0];
  }

  async updateQuery(id: string, updateData: Partial<InsertQuery>): Promise<Query | undefined> {
    const updatedData = { ...updateData, updatedAt: new Date() };
    const result = await db.update(queries)
      .set(updatedData)
      .where(eq(queries.id, id))
      .returning();
    return result[0];
  }

  async deleteQuery(id: string): Promise<boolean> {
    const result = await db.delete(queries).where(eq(queries.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async saveQueryResult(queryId: string, result: any): Promise<QueryResult> {
    const queryResultData = {
      queryId,
      data: result.data,
      columns: result.columns,
      executionTime: result.executionTime,
      rowCount: result.rowCount,
    };
    const dbResult = await db.insert(queryResults).values(queryResultData).returning();
    return dbResult[0];
  }

  async getQueryResult(id: string): Promise<QueryResult | undefined> {
    const result = await db.select().from(queryResults).where(eq(queryResults.id, id));
    return result[0];
  }

  async getQueryResultByQueryId(queryId: string): Promise<QueryResult | undefined> {
    const result = await db.select().from(queryResults).where(eq(queryResults.queryId, queryId));
    return result[0];
  }

  async getQueryHistory(connectionId?: string, limit: number = 50): Promise<Query[]> {
    let query = db.select().from(queries);
    
    if (connectionId) {
      query = query.where(eq(queries.connectionId, connectionId));
    }
    
    return await query.orderBy(queries.createdAt).limit(limit);
  }
}

export const storage = new PostgreSQLStorage();

// Keep MemStorage class available for testing
export { MemStorage };
