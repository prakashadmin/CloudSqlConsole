import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { databaseService } from "./services/database";
import { insertConnectionSchema, insertQuerySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Connection management routes
  app.get("/api/connections", async (req, res) => {
    try {
      const connections = await storage.getConnections();
      // Remove passwords from response for security
      const safeConnections = connections.map(conn => ({
        ...conn,
        password: undefined, // Don't expose passwords
      }));
      res.json(safeConnections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  app.post("/api/connections", async (req, res) => {
    try {
      const connectionData = insertConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(connectionData);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ error: "Invalid connection data" });
    }
  });

  app.post("/api/connections/:id/test", async (req, res) => {
    try {
      const connection = await storage.getConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const isValid = await databaseService.testConnection(connection);
      res.json({ success: isValid });
    } catch (error) {
      res.status(500).json({ error: "Connection test failed" });
    }
  });

  app.post("/api/connections/:id/activate", async (req, res) => {
    try {
      await storage.setActiveConnection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to activate connection" });
    }
  });

  app.delete("/api/connections/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteConnection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Connection not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete connection" });
    }
  });

  // Query execution routes
  app.post("/api/query/execute", async (req, res) => {
    try {
      const { connectionId, query } = req.body;
      
      if (!connectionId || !query) {
        return res.status(400).json({ error: "Connection ID and query are required" });
      }

      const connection = await storage.getConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const result = await databaseService.executeQuery(connectionId, connection, query);
      res.json(result);
    } catch (error) {
      console.error("Query execution error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Query execution failed" });
    }
  });

  // Schema routes
  app.get("/api/connections/:id/schema", async (req, res) => {
    try {
      const connection = await storage.getConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const schema = await databaseService.getSchema(connection);
      res.json(schema);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schema" });
    }
  });

  // Saved queries routes
  app.get("/api/queries", async (req, res) => {
    try {
      const connectionId = req.query.connectionId as string;
      const queries = await storage.getQueries(connectionId);
      res.json(queries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch queries" });
    }
  });

  app.post("/api/queries", async (req, res) => {
    try {
      const queryData = insertQuerySchema.parse(req.body);
      const query = await storage.createQuery(queryData);
      res.json(query);
    } catch (error) {
      res.status(400).json({ error: "Invalid query data" });
    }
  });

  app.put("/api/queries/:id", async (req, res) => {
    try {
      const queryData = insertQuerySchema.partial().parse(req.body);
      const query = await storage.updateQuery(req.params.id, queryData);
      if (!query) {
        return res.status(404).json({ error: "Query not found" });
      }
      res.json(query);
    } catch (error) {
      res.status(400).json({ error: "Invalid query data" });
    }
  });

  app.delete("/api/queries/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteQuery(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Query not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete query" });
    }
  });

  // Export routes
  app.post("/api/export/csv", async (req, res) => {
    try {
      const { data, columns } = req.body;
      
      if (!data || !columns) {
        return res.status(400).json({ error: "Data and columns are required" });
      }

      const csvContent = [
        columns.map((col: any) => col.name).join(','),
        ...data.map((row: any) => 
          columns.map((col: any) => JSON.stringify(row[col.name] || '')).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="query_results.csv"');
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ error: "Export failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
