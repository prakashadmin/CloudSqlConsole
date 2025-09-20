import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum for type safety
export const USER_ROLES = {
  ADMIN: 'admin',
  DEVELOPER: 'developer', 
  BUSINESS_USER: 'business_user'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const connections = pgTable("connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // mysql, postgresql, etc.
  host: text("host").notNull(),
  port: integer("port").notNull(),
  database: text("database").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  ssl: boolean("ssl").notNull().default(false),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const queries = pgTable("queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  content: text("content").notNull(),
  connectionId: varchar("connection_id").references(() => connections.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const queryResults = pgTable("query_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryId: varchar("query_id").references(() => queries.id),
  data: jsonb("data").notNull(),
  columns: jsonb("columns").notNull(),
  executionTime: integer("execution_time"), // in milliseconds
  rowCount: integer("row_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table for authentication and role management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // bcrypt hashed password
  role: text("role").notNull(), // admin, developer, business_user
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User sessions table for authentication
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Saved queries table for user-saved SQL queries
export const savedQueries = pgTable("saved_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryName: text("query_name").notNull(),
  queryText: text("query_text").notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  role: text("role").notNull(), // role of the user who saved it
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  createdAt: true,
});

export const insertQuerySchema = createInsertSchema(queries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true, // Don't allow direct password hash insertion
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.DEVELOPER, USER_ROLES.BUSINESS_USER]),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertSavedQuerySchema = createInsertSchema(savedQueries).omit({
  id: true,
  createdBy: true,
  role: true,
  createdAt: true,
}).extend({
  queryName: z.string().min(1, "Query name is required").max(100, "Query name must be less than 100 characters"),
  queryText: z.string().min(1, "Query text cannot be empty"),
});

export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;
export type InsertQuery = z.infer<typeof insertQuerySchema>;
export type Query = typeof queries.$inferSelect;
export type QueryResult = typeof queryResults.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type InsertSavedQuery = z.infer<typeof insertSavedQuerySchema>;
export type SavedQuery = typeof savedQueries.$inferSelect;
