import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import type { User, UserRole } from '@shared/schema';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  hasPermission: (action: 'CREATE_USER' | 'MANAGE_CONNECTIONS' | 'EXECUTE_QUERY' | 'READ_ONLY_QUERY') => boolean;
  isAdmin: boolean;
  isDeveloper: boolean;
  isBusinessUser: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated on app load
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const response = await apiRequest('GET', '/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      // User not authenticated, that's fine
      console.debug('User not authenticated:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    // Force a re-render which will trigger the redirect in App.tsx
  };

  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const hasPermission = (action: 'CREATE_USER' | 'MANAGE_CONNECTIONS' | 'EXECUTE_QUERY' | 'READ_ONLY_QUERY'): boolean => {
    if (!user) return false;

    switch (user.role) {
      case 'admin':
        // Admin has all permissions
        return true;
      case 'developer':
        // Developer can execute queries but cannot create users or manage connections
        return action === 'EXECUTE_QUERY' || action === 'READ_ONLY_QUERY';
      case 'business_user':
        // Business user can only execute read-only queries
        return action === 'READ_ONLY_QUERY';
      default:
        return false;
    }
  };

  const isAdmin = user?.role === 'admin';
  const isDeveloper = user?.role === 'developer';
  const isBusinessUser = user?.role === 'business_user';

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasPermission,
        isAdmin,
        isDeveloper,
        isBusinessUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}