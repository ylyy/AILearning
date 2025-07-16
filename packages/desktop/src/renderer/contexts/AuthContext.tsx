import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize isAuthenticated to prevent unnecessary re-renders
  const isAuthenticated = useMemo(() => !!user, [user]);

  // Memoize checkAuthStatus function
  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 检查本地存储的认证信息
      if (window.electronAPI) {
        const settings = await window.electronAPI.settings.get();
        if (settings.auth?.token && settings.auth?.user) {
          setUser(settings.auth.user);
        }
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化时检查用户状态
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Memoize login function
  const login = useCallback(async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' };
      }

      const result = await window.electronAPI.auth.login(credentials);
      
      if (result.success) {
        setUser(result.data.user);
        return { success: true };
      } else {
        return { success: false, error: result.error || '登录失败' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '网络连接失败' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (window.electronAPI) {
        await window.electronAPI.auth.logout();
      }
      
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize refreshUser function
  const refreshUser = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.auth.getUser();
        if (result.success) {
          setUser(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  }), [user, isAuthenticated, isLoading, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
