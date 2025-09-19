import { type Connection, type InsertConnection, type Query, type InsertQuery, type QueryResult } from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
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
      this.createConnection(pgConnection);
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
}

export const storage = new MemStorage();
