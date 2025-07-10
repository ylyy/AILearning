import * as fs from 'fs';
import * as path from 'path';
import { APIClient } from '@learning-supervisor/shared';

export class APIService {
  private apiClient: APIClient | null = null;
  private authToken: string | null = null;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:3001/api';
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    // 这里可以初始化API客户端
    // this.apiClient = new APIClient(config);
  }

  /**
   * 用户登录
   */
  async login(credentials: { email: string; password: string }): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();
      
      if (result.success) {
        this.setAuthToken(result.data.token);
      }
      
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('网络连接失败，请检查网络设置');
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
      this.authToken = null;
      this.apiClient = null;
    }
  }

  /**
   * 注册设备
   */
  async registerDevice(deviceInfo: {
    device_name: string;
    device_type: 'desktop' | 'mobile';
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

      if (!fs.existsSync(screenshotPath)) {
        throw new Error('截图文件不存在');
      }

      // 读取截图文件
      const fileBuffer = await fs.promises.readFile(screenshotPath);
      const fileName = path.basename(screenshotPath);
      
      // 创建FormData
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'image/png' });
      formData.append('screenshot', blob, fileName);
      formData.append('captured_at', new Date().toISOString());
      
      // 获取设备ID（这里需要从本地存储获取或创建）
      const deviceId = await this.getOrCreateDeviceId();
      formData.append('device_id', deviceId);

      const response = await fetch(`${this.baseURL}/screenshots/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
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
   * 获取或创建设备ID
   */
  private async getOrCreateDeviceId(): Promise<string> {
    // 从本地存储获取设备ID
    const Store = require('electron-store');
    const store = new Store();
    
    let deviceId = store.get('deviceId');
    
    if (!deviceId) {
      // 创建新设备
      const os = require('os');
      const deviceInfo = {
        device_name: `${os.hostname()}-${os.platform()}`,
        device_type: 'desktop' as const,
        platform: this.getPlatform(),
      };
      
      const result = await this.registerDevice(deviceInfo);
      if (result.success) {
        deviceId = result.data.id;
        store.set('deviceId', deviceId);
      } else {
        throw new Error('设备注册失败');
      }
    }
    
    return deviceId;
  }

  /**
   * 获取平台信息
   */
  private getPlatform(): string {
    const platform = process.platform;
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'mac';
      case 'linux':
        return 'linux';
      default:
        return 'unknown';
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
   * 获取用户统计数据
   */
  async getStats(period: 'today' | 'week' | 'month' = 'today'): Promise<any> {
    return this.get(`/stats/${period}`);
  }

  /**
   * 获取截图列表
   */
  async getScreenshots(params: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<any> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.get(`/screenshots?${queryString}`);
  }

  /**
   * 获取活动分析
   */
  async getAnalyses(params: {
    page?: number;
    limit?: number;
    activity_type?: string;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<any> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.get(`/analysis?${queryString}`);
  }

  /**
   * 获取通知
   */
  async getNotifications(params: {
    page?: number;
    limit?: number;
    unread_only?: boolean;
  } = {}): Promise<any> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.get(`/notifications?${queryString}`);
  }

  /**
   * 标记通知为已读
   */
  async markNotificationAsRead(notificationId: string): Promise<any> {
    return this.put(`/notifications/${notificationId}/read`, {});
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

  /**
   * 检查网络连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`, {
        method: 'GET',
        timeout: 5000,
      } as any);
      
      return response.ok;
    } catch (error) {
      console.error('Connection check failed:', error);
      return false;
    }
  }

  /**
   * 获取服务器状态
   */
  async getServerStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get server status:', error);
      return { status: 'error', message: '无法连接到服务器' };
    }
  }
}
