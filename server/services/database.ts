import mysql from 'mysql2/promise';
import { Client } from 'pg';
import type { Connection } from '@shared/schema';

export interface QueryExecutionResult {
  data: any[];
  columns: Array<{ name: string; type: string }>;
  executionTime: number;
  rowCount: number;
  hasMoreRows?: boolean;
  totalRowCount?: number;
}

export class DatabaseService {
  private connections: Map<string, any> = new Map();

  private addPaginationToQuery(query: string, dbType: 'mysql' | 'postgresql', limit: number, offset: number): { modifiedQuery: string; paginationApplied: boolean } {
    const trimmedQuery = query.trim();
    
    // Check if query already has LIMIT clause
    const hasLimit = /\bLIMIT\s+\d+/i.test(trimmedQuery);
    if (hasLimit) {
      // If query already has LIMIT, return as-is to avoid breaking user queries
      return { modifiedQuery: query, paginationApplied: false };
    }
    
    // Remove trailing semicolon to prevent malformed SQL
    const cleanQuery = trimmedQuery.replace(/;\s*$/, '');
    
    // Validate that limit and offset are safe integers
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new Error('Invalid limit parameter');
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Invalid offset parameter');
    }
    
    // Add pagination - both MySQL and PostgreSQL use same syntax
    const modifiedQuery = `${cleanQuery} LIMIT ${limit}${offset > 0 ? ` OFFSET ${offset}` : ''}`;
    return { modifiedQuery, paginationApplied: true };
  }

  async testConnection(connection: Connection): Promise<boolean> {
    try {
      if (connection.type === 'mysql') {
        const sslConfig = connection.ssl ? { rejectUnauthorized: false } : undefined;
        const conn = await mysql.createConnection({
          host: connection.host,
          port: connection.port,
          user: connection.username,
          password: connection.password,
          database: connection.database,
          ssl: sslConfig,
        });
        await conn.ping();
        await conn.end();
        return true;
      } else if (connection.type === 'postgresql') {
        const client = new Client({
          host: connection.host,
          port: connection.port,
          user: connection.username,
          password: connection.password,
          database: connection.database,
          ssl: connection.ssl ? { rejectUnauthorized: false } : false,
        });
        await client.connect();
        await client.end();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async executeQuery(
    connectionId: string, 
    connection: Connection, 
    query: string, 
    options?: { limit?: number; offset?: number }
  ): Promise<QueryExecutionResult> {
    const startTime = Date.now();
    
    try {
      if (connection.type === 'mysql') {
        return await this.executeMySQLQuery(connection, query, startTime, options);
      } else if (connection.type === 'postgresql') {
        return await this.executePostgreSQLQuery(connection, query, startTime, options);
      }
      throw new Error(`Unsupported database type: ${connection.type}`);
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  private async executeMySQLQuery(connection: Connection, query: string, startTime: number, options?: { limit?: number; offset?: number }): Promise<QueryExecutionResult> {
    const sslConfig = connection.ssl ? { rejectUnauthorized: false } : undefined;
    const conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database,
      ssl: sslConfig,
    });

    try {
      let modifiedQuery = query;
      let hasMoreRows = false;
      let paginationApplied = false;
      
      // If pagination is requested, check for more rows by fetching one extra
      if (options?.limit) {
        const checkLimit = options.limit + 1;
        const result = this.addPaginationToQuery(query, 'mysql', checkLimit, options.offset || 0);
        modifiedQuery = result.modifiedQuery;
        paginationApplied = result.paginationApplied;
      }
      
      const [rows, fields] = await conn.execute(modifiedQuery);
      const executionTime = Date.now() - startTime;
      
      const columns = (fields as any[]).map(field => ({
        name: field.name,
        type: field.type,
      }));

      let data = Array.isArray(rows) ? rows as any[] : [];
      
      // Only check for more rows and slice if pagination was actually applied
      if (options?.limit && paginationApplied && data.length > options.limit) {
        hasMoreRows = true;
        data = data.slice(0, options.limit);
      }
      
      return {
        data,
        columns,
        executionTime,
        rowCount: data.length,
        hasMoreRows: paginationApplied ? hasMoreRows : false,
      };
    } finally {
      await conn.end();
    }
  }

  private async executePostgreSQLQuery(connection: Connection, query: string, startTime: number, options?: { limit?: number; offset?: number }): Promise<QueryExecutionResult> {
    const client = new Client({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false,
    });

    try {
      await client.connect();
      
      let modifiedQuery = query;
      let hasMoreRows = false;
      let paginationApplied = false;
      
      // If pagination is requested, check for more rows by fetching one extra
      if (options?.limit) {
        const checkLimit = options.limit + 1;
        const result = this.addPaginationToQuery(query, 'postgresql', checkLimit, options.offset || 0);
        modifiedQuery = result.modifiedQuery;
        paginationApplied = result.paginationApplied;
      }
      
      const result = await client.query(modifiedQuery);
      const executionTime = Date.now() - startTime;
      
      const columns = result.fields.map(field => ({
        name: field.name,
        type: field.dataTypeID.toString(),
      }));

      let data = result.rows;
      
      // Only check for more rows and slice if pagination was actually applied
      if (options?.limit && paginationApplied && data.length > options.limit) {
        hasMoreRows = true;
        data = data.slice(0, options.limit);
      }

      return {
        data,
        columns,
        executionTime,
        rowCount: data.length,
        hasMoreRows: paginationApplied ? hasMoreRows : false,
      };
    } finally {
      await client.end();
    }
  }

  async getSchema(connection: Connection): Promise<any> {
    try {
      if (connection.type === 'mysql') {
        return await this.getMySQLSchema(connection);
      } else if (connection.type === 'postgresql') {
        return await this.getPostgreSQLSchema(connection);
      }
      throw new Error(`Unsupported database type: ${connection.type}`);
    } catch (error) {
      console.error('Schema fetch failed:', error);
      throw error;
    }
  }

  private async getMySQLSchema(connection: Connection): Promise<any> {
    const sslConfig = connection.ssl ? { rejectUnauthorized: false } : undefined;
    const conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database,
      ssl: sslConfig,
    });

    try {
      const [tables] = await conn.execute(`
        SELECT TABLE_NAME, TABLE_ROWS 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, [connection.database]);
      
      return { tables };
    } finally {
      await conn.end();
    }
  }

  private async getPostgreSQLSchema(connection: Connection): Promise<any> {
    const client = new Client({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false,
    });

    try {
      await client.connect();
      const result = await client.query(`
        SELECT table_name, 
               (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `);
      
      return { tables: result.rows };
    } finally {
      await client.end();
    }
  }
}

export const databaseService = new DatabaseService();
