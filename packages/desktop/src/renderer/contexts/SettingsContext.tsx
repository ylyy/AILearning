import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Settings {
  screenshotInterval: number; // 分钟
  autoStart: boolean;
  minimizeToTray: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  dataRetentionDays: number;
  uploadQuality: 'high' | 'medium' | 'low';
}

interface SettingsContextType {
  settings: Settings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  screenshotInterval: 15,
  autoStart: true,
  minimizeToTray: true,
  notifications: true,
  theme: 'system',
  language: 'zh-CN',
  dataRetentionDays: 30,
  uploadQuality: 'medium',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      // 模拟加载设置
      await new Promise(resolve => setTimeout(resolve, 500));

      // 尝试从localStorage加载设置
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };

      // 保存到localStorage
      localStorage.setItem('app-settings', JSON.stringify(updatedSettings));

      setSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  const resetSettings = async () => {
    try {
      // 清除localStorage中的设置
      localStorage.removeItem('app-settings');

      setSettings(defaultSettings);
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  };

  const value: SettingsContextType = {
    settings,
    isLoading,
    updateSettings,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
