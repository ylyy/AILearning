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
  const [isLoading, setIsLoading] = useState(false);

  // 初始化时加载设置
  useEffect(() => {
    console.log('SettingsProvider初始化，设置:', defaultSettings);
    // 直接使用默认设置，不需要异步加载
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error('解析设置失败:', error);
      }
    }
  }, []);

  const loadSettings = async () => {
    try {
      console.log('开始加载设置...');
      setIsLoading(true);

      // 减少加载时间
      await new Promise(resolve => setTimeout(resolve, 50));

      // 尝试从localStorage加载设置
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
        console.log('加载已保存的设置:', parsedSettings);
      } else {
        setSettings(defaultSettings);
        console.log('使用默认设置');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSettings(defaultSettings);
    } finally {
      console.log('设置加载完成');
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
