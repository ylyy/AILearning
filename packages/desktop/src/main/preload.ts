import { contextBridge, ipcRenderer } from 'electron';

// 定义API接口
interface ElectronAPI {
  // 认证相关
  auth: {
    login: (credentials: { email: string; password: string }) => Promise<any>;
    logout: () => Promise<any>;
    getUser: () => Promise<any>;
  };

  // 设置相关
  settings: {
    get: () => Promise<any>;
    set: (settings: any) => Promise<any>;
  };

  // 监控控制
  monitoring: {
    start: () => Promise<any>;
    stop: () => Promise<any>;
    getStatus: () => Promise<any>;
    takeScreenshot: () => Promise<any>;
  };

  // 截图相关
  screenshots: {
    getHistory: (limit?: number) => Promise<any>;
    getStatistics: () => Promise<any>;
  };

  // API调用
  api: {
    get: (endpoint: string) => Promise<any>;
    post: (endpoint: string, data: any) => Promise<any>;
    put: (endpoint: string, data: any) => Promise<any>;
    delete: (endpoint: string) => Promise<any>;
  };

  // 系统相关
  system: {
    getVersion: () => string;
    getPlatform: () => string;
    openExternal: (url: string) => Promise<void>;
    showInFolder: (path: string) => Promise<void>;
  };

  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  once: (channel: string, callback: (...args: any[]) => void) => void;

  // 移除所有监听器
  removeAllListeners: (channel: string) => void;
}

// 暴露给渲染进程的API
const electronAPI: ElectronAPI = {
  // 认证相关
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getUser: () => ipcRenderer.invoke('auth:getUser'),
  },

  // 设置相关
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings) => ipcRenderer.invoke('settings:set', settings),
  },

  // 监控控制
  monitoring: {
    start: () => ipcRenderer.invoke('monitoring:start'),
    stop: () => ipcRenderer.invoke('monitoring:stop'),
    getStatus: () => ipcRenderer.invoke('monitoring:status'),
    takeScreenshot: () => ipcRenderer.invoke('monitoring:takeScreenshot'),
  },

  // 截图相关
  screenshots: {
    getHistory: (limit) => ipcRenderer.invoke('screenshots:getHistory', limit),
    getStatistics: () => ipcRenderer.invoke('screenshots:getStatistics'),
  },

  // API调用
  api: {
    get: (endpoint) => ipcRenderer.invoke('api:get', endpoint),
    post: (endpoint, data) => ipcRenderer.invoke('api:post', endpoint, data),
    put: (endpoint, data) => ipcRenderer.invoke('api:put', endpoint, data),
    delete: (endpoint) => ipcRenderer.invoke('api:delete', endpoint),
  },

  // 系统相关
  system: {
    getVersion: () => process.env.npm_package_version || '1.0.0',
    getPlatform: () => process.platform,
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
    showInFolder: (path) => ipcRenderer.invoke('system:showInFolder', path),
  },

  // 事件监听
  on: (channel, callback) => {
    ipcRenderer.on(channel, callback);
  },

  off: (channel, callback) => {
    ipcRenderer.off(channel, callback);
  },

  once: (channel, callback) => {
    ipcRenderer.once(channel, callback);
  },

  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// 将API暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型声明，供TypeScript使用
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
