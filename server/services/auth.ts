import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { storage } from '../storage';
import { USER_ROLES, type User, type UserRole, type InsertUser, type LoginRequest } from '@shared/schema';

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly SESSION_DURATION_HOURS = 24;

  /**
   * Hash a plain text password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, AuthService.SALT_ROUNDS);
  }

  /**
   * Verify a plain text password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Create a new user account
   */
  async createUser(userData: InsertUser): Promise<User> {
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Validate role
    if (!Object.values(USER_ROLES).includes(userData.role)) {
      throw new Error('Invalid user role');
    }

    // Hash the password
    const passwordHash = await this.hashPassword(userData.password);

    // Create user with hashed password
    const user = await storage.createUser({
      ...userData,
      passwordHash,
    });

    return user;
  }

  /**
   * Authenticate user login credentials
   */
  async login(credentials: LoginRequest): Promise<{ user: User; sessionToken: string }> {
    // Find user by username
    const user = await storage.getUserByUsername(credentials.username);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is disabled');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Create session
    const sessionToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + AuthService.SESSION_DURATION_HOURS);

    await storage.createSession(user.id, sessionToken, expiresAt);

    return { user, sessionToken };
  }

  /**
   * Validate session token and return user
   */
  async validateSession(sessionToken: string): Promise<User | null> {
    if (!sessionToken) {
      return null;
    }

    // Get session from storage
    const session = await storage.getSessionByToken(sessionToken);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await storage.deleteSession(sessionToken);
      return null;
    }

    // Get user details
    const user = await storage.getUserById(session.userId);
    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  /**
   * Logout user by removing session
   */
  async logout(sessionToken: string): Promise<boolean> {
    return await storage.deleteSession(sessionToken);
  }

  /**
   * Clean up expired sessions (should be called periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    return await storage.deleteExpiredSessions();
  }

  /**
   * Check if user has permission for a specific action
   */
  hasPermission(user: User, action: 'CREATE_USER' | 'MANAGE_CONNECTIONS' | 'EXECUTE_QUERY' | 'READ_ONLY_QUERY'): boolean {
    switch (user.role) {
      case USER_ROLES.ADMIN:
        // Admin has all permissions
        return true;

      case USER_ROLES.DEVELOPER:
        // Developer can execute queries and manage connections but cannot create users
        return action === 'EXECUTE_QUERY' || action === 'READ_ONLY_QUERY' || action === 'MANAGE_CONNECTIONS';

      case USER_ROLES.BUSINESS_USER:
        // Business user can only execute read-only queries
        return action === 'READ_ONLY_QUERY';

      default:
        return false;
    }
  }

  /**
   * Validate if SQL query is read-only (for business users)
   */
  isReadOnlyQuery(sqlQuery: string): boolean {
    // Remove comments and normalize whitespace
    const normalizedQuery = sqlQuery
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .replace(/--.*$/gm, '') // Remove -- comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toUpperCase();

    // Check if query starts with SELECT (allowing WITH clauses)
    const readOnlyPatterns = [
      /^SELECT\s/,
      /^WITH\s.*SELECT\s/,
      /^EXPLAIN\s/,
      /^DESCRIBE\s/,
      /^SHOW\s/,
    ];

    // Check for any write operations
    const writePatterns = [
      /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE)\b/,
    ];

    // Must match read-only pattern and not contain write operations
    const isReadOnly = readOnlyPatterns.some(pattern => pattern.test(normalizedQuery));
    const hasWriteOps = writePatterns.some(pattern => pattern.test(normalizedQuery));

    return isReadOnly && !hasWriteOps;
  }

  /**
   * Create default admin user if no users exist
   */
  async createDefaultAdminIfNeeded(): Promise<void> {
    try {
      const users = await storage.getAllUsers();
      if (users.length === 0) {
        // Create default admin user
        await this.createUser({
          username: 'admin',
          password: 'admin123', // Should be changed immediately
          role: USER_ROLES.ADMIN,
          isActive: true,
        });
        console.log('✓ Default admin user created (username: admin, password: admin123)');
        console.log('⚠️  Please change the default password immediately!');
      }
    } catch (error) {
      console.error('Failed to create default admin user:', error);
    }
  }
}

export const authService = new AuthService();