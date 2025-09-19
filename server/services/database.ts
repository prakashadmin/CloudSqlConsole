import mysql from 'mysql2/promise';
import { Client } from 'pg';
import type { Connection } from '@shared/schema';

export interface QueryExecutionResult {
  data: any[];
  columns: Array<{ name: string; type: string }>;
  executionTime: number;
  rowCount: number;
}

export class DatabaseService {
  private connections: Map<string, any> = new Map();

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

  async executeQuery(connectionId: string, connection: Connection, query: string): Promise<QueryExecutionResult> {
    const startTime = Date.now();
    
    try {
      if (connection.type === 'mysql') {
        return await this.executeMySQLQuery(connection, query, startTime);
      } else if (connection.type === 'postgresql') {
        return await this.executePostgreSQLQuery(connection, query, startTime);
      }
      throw new Error(`Unsupported database type: ${connection.type}`);
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  private async executeMySQLQuery(connection: Connection, query: string, startTime: number): Promise<QueryExecutionResult> {
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
      const [rows, fields] = await conn.execute(query);
      const executionTime = Date.now() - startTime;
      
      const columns = (fields as any[]).map(field => ({
        name: field.name,
        type: field.type,
      }));

      const data = Array.isArray(rows) ? rows : [];
      
      return {
        data,
        columns,
        executionTime,
        rowCount: data.length,
      };
    } finally {
      await conn.end();
    }
  }

  private async executePostgreSQLQuery(connection: Connection, query: string, startTime: number): Promise<QueryExecutionResult> {
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
      const result = await client.query(query);
      const executionTime = Date.now() - startTime;
      
      const columns = result.fields.map(field => ({
        name: field.name,
        type: field.dataTypeID.toString(),
      }));

      return {
        data: result.rows,
        columns,
        executionTime,
        rowCount: result.rowCount || 0,
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
