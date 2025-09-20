import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';
import type { User, UserRole } from '@shared/schema';
import { USER_ROLES } from '@shared/schema';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to authenticate user session
 * Attaches user to request.user if valid session exists
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Get session token from cookie or Authorization header
    const sessionToken = req.cookies?.sessionToken || 
      req.headers.authorization?.replace('Bearer ', '');

    if (sessionToken) {
      const user = await authService.validateSession(sessionToken);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    next(); // Continue without authentication - some routes might be public
  }
}

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
}

/**
 * Middleware factory to require specific role(s)
 * Returns 403 if user doesn't have required role
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

/**
 * Middleware to check specific permission
 * Returns 403 if user doesn't have permission
 */
export function requirePermission(action: 'CREATE_USER' | 'MANAGE_CONNECTIONS' | 'EXECUTE_QUERY' | 'READ_ONLY_QUERY') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!authService.hasPermission(req.user, action)) {
      return res.status(403).json({ 
        error: `Access denied. Insufficient permissions for: ${action}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: req.user.role,
        requiredAction: action
      });
    }

    next();
  };
}

/**
 * Middleware to validate SQL queries for business users
 * Checks if query is read-only for business users
 */
export function validateQueryPermissions(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ 
      error: 'SQL query is required',
      code: 'QUERY_REQUIRED'
    });
  }

  // For business users, ensure query is read-only
  if (req.user.role === USER_ROLES.BUSINESS_USER) {
    if (!authService.isReadOnlyQuery(query)) {
      return res.status(403).json({ 
        error: 'Business users can only execute read-only (SELECT) queries',
        code: 'READ_ONLY_REQUIRED',
        userRole: req.user.role
      });
    }
  }
  
  // Admin and developer users can execute any query (including UPDATE, DELETE, etc.)
  // No additional validation required for these roles

  next();
}