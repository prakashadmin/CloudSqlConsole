import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { databaseService } from "./services/database";
import { authService } from "./services/auth";
import { insertConnectionSchema, insertQuerySchema, insertUserSchema, loginSchema, insertSavedQuerySchema, USER_ROLES } from "@shared/schema";
import { authenticateUser, requireAuth, requireRole, requirePermission, validateQueryPermissions } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply authentication middleware to all routes
  app.use(authenticateUser);

  // Authentication routes (public)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const { user, sessionToken } = await authService.login(credentials);
      
      // Set HTTP-only cookie for session token
      res.cookie('sessionToken', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      });
      
      // Return user info without password hash
      const { passwordHash, ...userInfo } = user;
      res.json({ user: userInfo, message: 'Login successful' });
    } catch (error) {
      res.status(401).json({ 
        error: error instanceof Error ? error.message : 'Login failed',
        code: 'LOGIN_FAILED'
      });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const sessionToken = req.cookies?.sessionToken;
      if (sessionToken) {
        await authService.logout(sessionToken);
      }
      
      res.clearCookie('sessionToken');
      res.json({ message: 'Logout successful' });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    // Return current user info without password hash
    const { passwordHash, ...userInfo } = req.user!;
    res.json({ user: userInfo });
  });

  // User management routes (Admin only)
  app.post("/api/users", requirePermission('CREATE_USER'), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await authService.createUser(userData);
      
      // Return user info without password hash
      const { passwordHash, ...userInfo } = user;
      res.json({ user: userInfo, message: 'User created successfully' });
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to create user',
        code: 'USER_CREATION_FAILED'
      });
    }
  });

  app.get("/api/users", requireRole(USER_ROLES.ADMIN), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password hashes from response
      const safeUsers = users.map(({ passwordHash, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.delete("/api/users/:id", requireRole(USER_ROLES.ADMIN), async (req, res) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ 
          error: 'Cannot delete your own account',
          code: 'SELF_DELETE_FORBIDDEN'
        });
      }
      
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });
  // Connection management routes (require authentication)
  app.get("/api/connections", requireAuth, async (req, res) => {
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

  app.post("/api/connections", requirePermission('MANAGE_CONNECTIONS'), async (req, res) => {
    try {
      const connectionData = insertConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(connectionData);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ error: "Invalid connection data" });
    }
  });

  app.post("/api/connections/:id/test", requirePermission('MANAGE_CONNECTIONS'), async (req, res) => {
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

  app.post("/api/connections/:id/activate", requirePermission('MANAGE_CONNECTIONS'), async (req, res) => {
    try {
      await storage.setActiveConnection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to activate connection" });
    }
  });

  app.delete("/api/connections/:id", requirePermission('MANAGE_CONNECTIONS'), async (req, res) => {
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

  // Query execution routes (with role-based SQL validation)
  app.post("/api/query/execute", validateQueryPermissions, async (req, res) => {
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
      
      // Save query to history (auto-generated name)
      try {
        const queryName = `Query executed at ${new Date().toLocaleString()}`;
        const savedQuery = await storage.createQuery({
          name: queryName,
          content: query,
          connectionId: connectionId
        });
        
        // Save query result
        if (savedQuery.id) {
          await storage.saveQueryResult(savedQuery.id, result);
        }
      } catch (historyError) {
        console.warn("Failed to save query to history:", historyError);
        // Don't fail the main request if history save fails
      }
      
      res.json(result);
    } catch (error) {
      console.error("Query execution error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Query execution failed" });
    }
  });

  // Schema routes
  app.get("/api/connections/:id/schema", requireAuth, async (req, res) => {
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

  // Query history and saved queries routes (require authentication)
  app.get("/api/queries", requireAuth, async (req, res) => {
    try {
      const connectionId = req.query.connectionId as string;
      const queries = await storage.getQueries(connectionId);
      res.json(queries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch queries" });
    }
  });

  app.get("/api/queries/history", requireAuth, async (req, res) => {
    try {
      const connectionId = req.query.connectionId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const queries = await storage.getQueryHistory(connectionId, limit);
      res.json(queries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch query history" });
    }
  });

  app.get("/api/queries/:id/result", requireAuth, async (req, res) => {
    try {
      const queryId = req.params.id;
      const result = await storage.getQueryResultByQueryId(queryId);
      if (!result) {
        return res.status(404).json({ error: "Query result not found" });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch query result" });
    }
  });

  // Saved queries routes (user-saved queries with role-based access)
  app.post("/api/saved-queries", requireAuth, async (req, res) => {
    try {
      const savedQueryData = insertSavedQuerySchema.parse(req.body);
      const user = req.user!;
      
      const savedQuery = await storage.createSavedQuery(user.id, user.role, savedQueryData);
      res.json(savedQuery);
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to save query",
        code: "SAVE_QUERY_FAILED"
      });
    }
  });

  app.get("/api/saved-queries", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const savedQueries = await storage.getSavedQueriesForUser(user.id, user.role);
      res.json(savedQueries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch saved queries" });
    }
  });

  app.delete("/api/saved-queries/:id", requireAuth, async (req, res) => {
    try {
      const queryId = req.params.id;
      const user = req.user!;
      
      const deleted = await storage.deleteSavedQuery(queryId, user.id);
      if (!deleted) {
        return res.status(404).json({ error: "Query not found or access denied" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete saved query" });
    }
  });

  app.get("/api/saved-queries/:id", requireAuth, async (req, res) => {
    try {
      const queryId = req.params.id;
      const savedQuery = await storage.getSavedQueryById(queryId);
      
      if (!savedQuery) {
        return res.status(404).json({ error: "Saved query not found" });
      }
      
      // Check role-based access
      const user = req.user!;
      let hasAccess = false;
      
      if (user.role === 'business_user') {
        hasAccess = savedQuery.createdBy === user.id;
      } else if (user.role === 'developer') {
        hasAccess = savedQuery.role === 'developer';
      } else if (user.role === 'admin') {
        hasAccess = savedQuery.role === 'business_user' || savedQuery.role === 'developer' || savedQuery.role === 'admin';
      }
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(savedQuery);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch saved query" });
    }
  });

  app.post("/api/queries", requireAuth, async (req, res) => {
    try {
      const queryData = insertQuerySchema.parse(req.body);
      const query = await storage.createQuery(queryData);
      res.json(query);
    } catch (error) {
      res.status(400).json({ error: "Invalid query data" });
    }
  });

  app.put("/api/queries/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/queries/:id", requireAuth, async (req, res) => {
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

  // Export routes (require authentication)
  app.post("/api/export/csv", requireAuth, async (req, res) => {
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
