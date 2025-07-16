import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ScreenshotsPage = lazy(() => import('./pages/ScreenshotsPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// 受保护的路由组件 - 使用React.memo优化
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
});

ProtectedRoute.displayName = 'ProtectedRoute';

// 主应用内容组件 - 使用React.memo优化
const AppContent: React.FC = React.memo(() => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/" replace /> : (
              <Suspense fallback={<LoadingSpinner />}>
                <LoginPage />
              </Suspense>
            )
          } 
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/screenshots" element={<ScreenshotsPage />} />
                    <Route path="/analysis" element={<AnalysisPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
});

AppContent.displayName = 'AppContent';

// 根应用组件 - 使用React.memo优化
const App: React.FC = React.memo(() => {
  const [isElectronReady, setIsElectronReady] = useState(false);

  useEffect(() => {
    // 检查Electron API是否可用
    if (window.electronAPI) {
      setIsElectronReady(true);
    } else {
      // 在开发环境中，可能需要等待一段时间
      const timer = setTimeout(() => {
        setIsElectronReady(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isElectronReady) {
    return <LoadingSpinner />;
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </SettingsProvider>
    </AuthProvider>
  );
});

App.displayName = 'App';

export default App;
