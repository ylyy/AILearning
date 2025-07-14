import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ScreenshotsPage from './pages/ScreenshotsPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';
import LoadingSpinner from './components/UI/LoadingSpinner';

// 简单的测试组件
const TestApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🎉 AI学习监督系统
        </h1>
        <p className="text-gray-600 mb-4">
          React应用已成功启动！
        </p>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">✅ React 正常工作</p>
          <p className="text-sm text-gray-500">✅ Tailwind CSS 正常工作</p>
          <p className="text-sm text-gray-500">✅ Vite 热重载正常</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          重新加载
        </button>
      </div>
    </div>
  );
};

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 主应用组件
const AppContent: React.FC = () => {
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
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          } 
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/screenshots" element={<ScreenshotsPage />} />
                  <Route path="/analysis" element={<AnalysisPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

// 根应用组件
const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
