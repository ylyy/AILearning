import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MonitoringContextType {
  isMonitoring: boolean;
  isRecording: boolean;
  nextScreenshot: Date | null;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  startRecording: () => void;
  stopRecording: () => void;
  takeScreenshot: () => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};

interface MonitoringProviderProps {
  children: ReactNode;
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({ children }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [nextScreenshot, setNextScreenshot] = useState<Date | null>(null);

  useEffect(() => {
    // 初始化时加载监控状态
    const loadMonitoringStatus = async () => {
      try {
        if (window.electronAPI) {
          const status = await window.electronAPI.monitoring.getStatus();
          setIsMonitoring(status.isRunning);
          setNextScreenshot(status.nextScreenshot ? new Date(status.nextScreenshot) : null);
        }
      } catch (error) {
        console.error('Failed to load monitoring status:', error);
      }
    };

    loadMonitoringStatus();

    // 设置定时器来更新状态
    const interval = setInterval(loadMonitoringStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const startMonitoring = async () => {
    try {
      // 如果正在录制，先停止录制
      if (isRecording) {
        stopRecording();
      }

      if (window.electronAPI) {
        await window.electronAPI.monitoring.start();
        setIsMonitoring(true);
        
        // 重新获取状态以更新下次截图时间
        const status = await window.electronAPI.monitoring.getStatus();
        setNextScreenshot(status.nextScreenshot ? new Date(status.nextScreenshot) : null);
        console.log('学习监控已开始');
      } else {
        setIsMonitoring(true);
        console.log('开始学习监控 (模拟模式)');
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      throw error;
    }
  };

  const stopMonitoring = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.monitoring.stop();
        setIsMonitoring(false);
        setNextScreenshot(null);
        console.log('学习监控已停止');
      } else {
        setIsMonitoring(false);
        console.log('停止学习监控 (模拟模式)');
      }
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      throw error;
    }
  };

  const startRecording = () => {
    // 如果正在监控，先停止监控
    if (isMonitoring) {
      stopMonitoring();
    }
    setIsRecording(true);
    console.log('开始截图记录');
  };

  const stopRecording = () => {
    setIsRecording(false);
    console.log('停止截图记录');
  };

  const takeScreenshot = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.monitoring.takeScreenshot();
        if (result.success) {
          console.log('截图已保存:', result.filepath);
        }
        return result;
      } else {
        console.log('拍摄截图 (模拟模式)');
      }
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      throw error;
    }
  };

  return (
    <MonitoringContext.Provider value={{
      isMonitoring,
      isRecording,
      nextScreenshot,
      startMonitoring,
      stopMonitoring,
      startRecording,
      stopRecording,
      takeScreenshot
    }}>
      {children}
    </MonitoringContext.Provider>
  );
};