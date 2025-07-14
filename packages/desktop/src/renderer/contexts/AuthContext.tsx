import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  // 开发环境下直接设置用户，不需要加载状态
  const defaultUser: User = {
    id: 'dev-user-1',
    email: 'user@example.com',
    name: '开发用户'
  };

  const [user, setUser] = useState<User | null>(defaultUser);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!user;

  // 初始化时检查用户状态
  useEffect(() => {
    console.log('AuthProvider初始化，用户:', user);
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('开始检查认证状态...');
      setIsLoading(true);

      // 减少加载时间
      await new Promise(resolve => setTimeout(resolve, 100));

      // 开发环境下创建一个默认用户
      const defaultUser: User = {
        id: 'dev-user-1',
        email: 'user@example.com',
        name: '开发用户'
      };

      console.log('设置默认用户:', defaultUser);
      setUser(defaultUser);
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      console.log('认证检查完成，设置loading为false');
      setIsLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);

      // 模拟登录过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 简单的验证逻辑
      if (credentials.email && credentials.password) {
        const user: User = {
          id: 'user-' + Date.now(),
          email: credentials.email,
          name: credentials.email.split('@')[0]
        };
        setUser(user);
        return { success: true };
      } else {
        return { success: false, error: '请输入邮箱和密码' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '登录失败' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // 模拟登出过程
      await new Promise(resolve => setTimeout(resolve, 500));

      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      // 在开发环境下，刷新用户信息不做任何操作
      console.log('Refresh user called');
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
