import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';

export class APIService {
  private baseURL: string;
  private authToken: string | null = null;

  constructor() {
    this.baseURL = __DEV__ 
      ? 'http://localhost:3001/api' 
      : 'https://your-production-api.com/api';
    
    this.loadAuthToken();
  }

  /**
   * 加载认证令牌
   */
  private async loadAuthToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        this.authToken = token;
      }
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }

  /**
   * 保存认证令牌
   */
  private async saveAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_token', token);
      this.authToken = token;
    } catch (error) {
      console.error('Failed to save auth token:', error);
    }
  }

  /**
   * 清除认证令牌
   */
  private async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
      this.authToken = null;
    } catch (error) {
      console.error('Failed to clear auth token:', error);
    }
  }

  /**
   * 检查网络连接
   */
  private async checkNetworkConnection(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected && netInfo.isInternetReachable;
    } catch (error) {
      console.error('Network check failed:', error);
      return false;
    }
  }

  /**
   * 用户登录
   */
  async login(credentials: { email: string; password: string }): Promise<any> {
    try {
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        throw new Error('网络连接不可用');
      }

      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();
      
      if (result.success) {
        await this.saveAuthToken(result.data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(result.data.user));
      }
      
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('登录失败，请检查网络连接');
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      if (this.authToken) {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      await this.clearAuthToken();
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('device_id');
    }
  }

  /**
   * 注册设备
   */
  async registerDevice(deviceInfo: {
    device_name: string;
    device_type: 'mobile';
    platform: string;
  }): Promise<any> {
    return this.post('/devices/register', deviceInfo);
  }

  /**
   * 上传截图
   */
  async uploadScreenshot(screenshotPath: string): Promise<any> {
    try {
      if (!this.authToken) {
        throw new Error('未登录，无法上传截图');
      }

      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        // 如果没有网络连接，将截图保存到待上传队列
        await this.addToUploadQueue(screenshotPath);
        throw new Error('网络连接不可用，截图已保存到待上传队列');
      }

      // 检查文件是否存在
      const exists = await RNFS.exists(screenshotPath);
      if (!exists) {
        throw new Error('截图文件不存在');
      }

      // 读取文件
      const fileData = await RNFS.readFile(screenshotPath, 'base64');
      
      // 获取设备ID
      const deviceId = await this.getOrCreateDeviceId();

      // 创建FormData
      const formData = new FormData();
      formData.append('screenshot', {
        uri: `file://${screenshotPath}`,
        type: 'image/png',
        name: 'screenshot.png',
      } as any);
      formData.append('captured_at', new Date().toISOString());
      formData.append('device_id', deviceId);

      const response = await fetch(`${this.baseURL}/screenshots/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      console.log('Screenshot uploaded successfully:', result.data.id);
      return result;
    } catch (error) {
      console.error('Failed to upload screenshot:', error);
      throw error;
    }
  }

  /**
   * 添加到上传队列
   */
  private async addToUploadQueue(screenshotPath: string): Promise<void> {
    try {
      const queueKey = 'upload_queue';
      const existingQueue = await AsyncStorage.getItem(queueKey);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      queue.push({
        path: screenshotPath,
        timestamp: new Date().toISOString(),
      });

      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to add to upload queue:', error);
    }
  }

  /**
   * 处理上传队列
   */
  async processUploadQueue(): Promise<void> {
    try {
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        return;
      }

      const queueKey = 'upload_queue';
      const existingQueue = await AsyncStorage.getItem(queueKey);
      if (!existingQueue) {
        return;
      }

      const queue = JSON.parse(existingQueue);
      const successfulUploads: number[] = [];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        try {
          await this.uploadScreenshot(item.path);
          successfulUploads.push(i);
        } catch (error) {
          console.error(`Failed to upload queued screenshot ${item.path}:`, error);
        }
      }

      // 移除成功上传的项目
      const remainingQueue = queue.filter((_, index) => !successfulUploads.includes(index));
      await AsyncStorage.setItem(queueKey, JSON.stringify(remainingQueue));
    } catch (error) {
      console.error('Failed to process upload queue:', error);
    }
  }

  /**
   * 获取或创建设备ID
   */
  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      
      if (!deviceId) {
        // 创建新设备
        const DeviceInfo = require('react-native-device-info');
        const deviceName = await DeviceInfo.getDeviceName();
        const platform = require('react-native').Platform.OS;
        
        const deviceInfo = {
          device_name: deviceName,
          device_type: 'mobile' as const,
          platform: platform === 'ios' ? 'ios' : 'android',
        };
        
        const result = await this.registerDevice(deviceInfo);
        if (result.success) {
          deviceId = result.data.id;
          await AsyncStorage.setItem('device_id', deviceId);
        } else {
          throw new Error('设备注册失败');
        }
      }
      
      return deviceId;
    } catch (error) {
      console.error('Failed to get or create device ID:', error);
      throw error;
    }
  }

  /**
   * 发送心跳
   */
  async sendHeartbeat(): Promise<void> {
    try {
      const deviceId = await this.getOrCreateDeviceId();
      await this.put(`/devices/${deviceId}/heartbeat`, {});
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  /**
   * 通用GET请求
   */
  async get(endpoint: string): Promise<any> {
    return this.request('GET', endpoint);
  }

  /**
   * 通用POST请求
   */
  async post(endpoint: string, data: any): Promise<any> {
    return this.request('POST', endpoint, data);
  }

  /**
   * 通用PUT请求
   */
  async put(endpoint: string, data: any): Promise<any> {
    return this.request('PUT', endpoint, data);
  }

  /**
   * 通用DELETE请求
   */
  async delete(endpoint: string): Promise<any> {
    return this.request('DELETE', endpoint);
  }

  /**
   * 通用请求方法
   */
  private async request(method: string, endpoint: string, data?: any): Promise<any> {
    try {
      if (!this.authToken) {
        throw new Error('未登录，请先登录');
      }

      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        throw new Error('网络连接不可用');
      }

      const url = `${this.baseURL}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`API request failed (${method} ${endpoint}):`, error);
      throw error;
    }
  }
}
