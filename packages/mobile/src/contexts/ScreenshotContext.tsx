import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ScreenshotService } from '../services/ScreenshotService';
import { APIService } from '../services/APIService';

interface ScreenshotContextType {
  isMonitoring: boolean;
  intervalMinutes: number;
  lastScreenshot: string | null;
  nextScreenshotTime: Date | null;
  totalScreenshots: number;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  takeManualScreenshot: () => Promise<void>;
  setInterval: (minutes: number) => Promise<void>;
  getScreenshotHistory: () => Promise<string[]>;
}

const ScreenshotContext = createContext<ScreenshotContextType | undefined>(undefined);

interface ScreenshotProviderProps {
  children: ReactNode;
}

export const ScreenshotProvider: React.FC<ScreenshotProviderProps> = ({ children }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const [nextScreenshotTime, setNextScreenshotTime] = useState<Date | null>(null);
  const [totalScreenshots, setTotalScreenshots] = useState(0);

  const screenshotService = ScreenshotService.getInstance();
  const apiService = APIService.getInstance();

  useEffect(() => {
    // 初始化时检查服务状态
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    try {
      const isRunning = screenshotService.isRunning();
      setIsMonitoring(isRunning);
      
      if (isRunning) {
        const nextTime = screenshotService.getNextScreenshotTime();
        setNextScreenshotTime(nextTime);
      }

      // 获取截图历史数量
      const history = await screenshotService.getScreenshotHistory();
      setTotalScreenshots(history.length);
      
      if (history.length > 0) {
        setLastScreenshot(history[0]);
      }
    } catch (error) {
      console.error('Failed to check screenshot service status:', error);
    }
  };

  const startMonitoring = async () => {
    try {
      await screenshotService.start();
      setIsMonitoring(true);
      
      const nextTime = screenshotService.getNextScreenshotTime();
      setNextScreenshotTime(nextTime);
      
      console.log('Screenshot monitoring started');
    } catch (error) {
      console.error('Failed to start screenshot monitoring:', error);
      throw error;
    }
  };

  const stopMonitoring = async () => {
    try {
      await screenshotService.stop();
      setIsMonitoring(false);
      setNextScreenshotTime(null);
      
      console.log('Screenshot monitoring stopped');
    } catch (error) {
      console.error('Failed to stop screenshot monitoring:', error);
      throw error;
    }
  };

  const takeManualScreenshot = async () => {
    try {
      const screenshotPath = await screenshotService.takeScreenshot();
      
      if (screenshotPath) {
        setLastScreenshot(screenshotPath);
        setTotalScreenshots(prev => prev + 1);
        
        // 尝试上传到服务器
        try {
          await apiService.uploadScreenshot(screenshotPath);
          console.log('Screenshot uploaded successfully');
        } catch (uploadError) {
          console.error('Failed to upload screenshot:', uploadError);
          // 上传失败不影响本地保存
        }
        
        console.log('Manual screenshot taken:', screenshotPath);
      }
    } catch (error) {
      console.error('Failed to take manual screenshot:', error);
      throw error;
    }
  };

  const setInterval = async (minutes: number) => {
    try {
      await screenshotService.setIntervalMinutes(minutes);
      setIntervalMinutes(minutes);
      
      if (isMonitoring) {
        const nextTime = screenshotService.getNextScreenshotTime();
        setNextScreenshotTime(nextTime);
      }
      
      console.log(`Screenshot interval set to ${minutes} minutes`);
    } catch (error) {
      console.error('Failed to set screenshot interval:', error);
      throw error;
    }
  };

  const getScreenshotHistory = async () => {
    try {
      return await screenshotService.getScreenshotHistory();
    } catch (error) {
      console.error('Failed to get screenshot history:', error);
      return [];
    }
  };

  const value: ScreenshotContextType = {
    isMonitoring,
    intervalMinutes,
    lastScreenshot,
    nextScreenshotTime,
    totalScreenshots,
    startMonitoring,
    stopMonitoring,
    takeManualScreenshot,
    setInterval,
    getScreenshotHistory,
  };

  return (
    <ScreenshotContext.Provider value={value}>
      {children}
    </ScreenshotContext.Provider>
  );
};

export const useScreenshot = () => {
  const context = useContext(ScreenshotContext);
  if (!context) {
    throw new Error('useScreenshot must be used within a ScreenshotProvider');
  }
  return context;
};