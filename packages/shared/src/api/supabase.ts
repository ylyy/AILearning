import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { 
  User, 
  Device, 
  Screenshot, 
  ActivityAnalysis, 
  LearningSession,
  DailyStats,
  Notification,
  ApiResponse 
} from '../types';
import { DB_TABLES, STORAGE_BUCKETS } from '../constants';

// Request cache for frequently accessed data
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for database queries

// Connection pool for better performance
class ConnectionPool {
  private clients: SupabaseClient[] = [];
  private currentIndex = 0;
  private maxConnections = 5;

  constructor(url: string, anonKey: string) {
    for (let i = 0; i < this.maxConnections; i++) {
      this.clients.push(createClient(url, anonKey));
    }
  }

  getClient(): SupabaseClient {
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.maxConnections;
    return client;
  }
}

export class SupabaseAPI {
  private pool: ConnectionPool;
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.pool = new ConnectionPool(url, anonKey);
    this.client = this.pool.getClient();
  }

  /**
   * 获取缓存的数据
   */
  private getCachedData<T>(key: string): T | null {
    const cached = requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  /**
   * 设置缓存数据
   */
  private setCachedData<T>(key: string, data: T): void {
    requestCache.set(key, { data, timestamp: Date.now() });
    
    // 清理过期缓存
    this.cleanupCache();
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        requestCache.delete(key);
      }
    }
  }

  // 认证相关方法
  async signUp(email: string, password: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data.user as User };
    } catch (error) {
      return { success: false, error: '注册失败' };
    }
  }

  async signIn(email: string, password: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data.user as User };
    } catch (error) {
      return { success: false, error: '登录失败' };
    }
  }

  async signOut(): Promise<ApiResponse> {
    try {
      const { error } = await this.client.auth.signOut();
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: '登出失败' };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.client.auth.getUser();
    return user as User | null;
  }

  // 设备管理 - 优化版本
  async createDevice(device: Omit<Device, 'id' | 'created_at'>): Promise<ApiResponse<Device>> {
    try {
      const { data, error } = await this.client
        .from(DB_TABLES.DEVICES)
        .insert(device)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 清除相关缓存
      this.clearDeviceCache(device.user_id);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: '创建设备失败' };
    }
  }

  async getDevices(userId: string): Promise<ApiResponse<Device[]>> {
    try {
      // 检查缓存
      const cacheKey = `devices_${userId}`;
      const cached = this.getCachedData<Device[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const { data, error } = await this.client
        .from(DB_TABLES.DEVICES)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data || [];
      
      // 缓存结果
      this.setCachedData(cacheKey, result);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '获取设备列表失败' };
    }
  }

  async updateDeviceLastActive(deviceId: string): Promise<ApiResponse> {
    try {
      const { error } = await this.client
        .from(DB_TABLES.DEVICES)
        .update({ last_active: new Date().toISOString() })
        .eq('id', deviceId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: '更新设备活动时间失败' };
    }
  }

  // 截图管理 - 优化版本
  async uploadScreenshot(file: File, filePath: string): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await this.client.storage
        .from(STORAGE_BUCKETS.SCREENSHOTS)
        .upload(filePath, file);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data.path };
    } catch (error) {
      return { success: false, error: '上传截图失败' };
    }
  }

  async createScreenshotRecord(screenshot: Omit<Screenshot, 'id' | 'created_at'>): Promise<ApiResponse<Screenshot>> {
    try {
      const { data, error } = await this.client
        .from(DB_TABLES.SCREENSHOTS)
        .insert(screenshot)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 清除相关缓存
      this.clearScreenshotCache(screenshot.user_id);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: '创建截图记录失败' };
    }
  }

  async getScreenshots(userId: string, limit: number = 50): Promise<ApiResponse<Screenshot[]>> {
    try {
      // 检查缓存
      const cacheKey = `screenshots_${userId}_${limit}`;
      const cached = this.getCachedData<Screenshot[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const { data, error } = await this.client
        .from(DB_TABLES.SCREENSHOTS)
        .select('*')
        .eq('user_id', userId)
        .order('captured_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data || [];
      
      // 缓存结果
      this.setCachedData(cacheKey, result);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '获取截图列表失败' };
    }
  }

  async updateScreenshotAnalysisStatus(
    screenshotId: string, 
    status: Screenshot['analysis_status']
  ): Promise<ApiResponse> {
    try {
      const { error } = await this.client
        .from(DB_TABLES.SCREENSHOTS)
        .update({ analysis_status: status })
        .eq('id', screenshotId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: '更新截图分析状态失败' };
    }
  }

  // 活动分析管理 - 优化版本
  async createActivityAnalysis(analysis: Omit<ActivityAnalysis, 'id' | 'created_at'>): Promise<ApiResponse<ActivityAnalysis>> {
    try {
      const { data, error } = await this.client
        .from(DB_TABLES.ACTIVITY_ANALYSES)
        .insert(analysis)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 清除相关缓存
      this.clearAnalysisCache(analysis.user_id);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: '创建活动分析失败' };
    }
  }

  async getActivityAnalyses(
    userId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<ApiResponse<ActivityAnalysis[]>> {
    try {
      // 检查缓存
      const cacheKey = `analyses_${userId}_${startDate}_${endDate}`;
      const cached = this.getCachedData<ActivityAnalysis[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      let query = this.client
        .from(DB_TABLES.ACTIVITY_ANALYSES)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data || [];
      
      // 缓存结果
      this.setCachedData(cacheKey, result);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '获取活动分析失败' };
    }
  }

  // 学习会话管理 - 优化版本
  async createLearningSession(session: Omit<LearningSession, 'id' | 'created_at'>): Promise<ApiResponse<LearningSession>> {
    try {
      const { data, error } = await this.client
        .from(DB_TABLES.LEARNING_SESSIONS)
        .insert(session)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 清除相关缓存
      this.clearSessionCache(session.user_id);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: '创建学习会话失败' };
    }
  }

  async updateLearningSession(
    sessionId: string, 
    updates: Partial<LearningSession>
  ): Promise<ApiResponse<LearningSession>> {
    try {
      const { data, error } = await this.client
        .from(DB_TABLES.LEARNING_SESSIONS)
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 清除相关缓存
      if (data.user_id) {
        this.clearSessionCache(data.user_id);
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: '更新学习会话失败' };
    }
  }

  // 通知管理 - 优化版本
  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<ApiResponse<Notification>> {
    try {
      const { data, error } = await this.client
        .from(DB_TABLES.NOTIFICATIONS)
        .insert(notification)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 清除相关缓存
      this.clearNotificationCache(notification.user_id);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: '创建通知失败' };
    }
  }

  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<ApiResponse<Notification[]>> {
    try {
      // 检查缓存
      const cacheKey = `notifications_${userId}_${unreadOnly}`;
      const cached = this.getCachedData<Notification[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      let query = this.client
        .from(DB_TABLES.NOTIFICATIONS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data || [];
      
      // 缓存结果
      this.setCachedData(cacheKey, result);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '获取通知失败' };
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    try {
      const { error } = await this.client
        .from(DB_TABLES.NOTIFICATIONS)
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: '标记通知为已读失败' };
    }
  }

  // 工具方法
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // 实时订阅 - 优化版本
  subscribeToScreenshots(userId: string, callback: (payload: any) => void) {
    return this.client
      .channel(`screenshots_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_TABLES.SCREENSHOTS,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload);
          // 清除相关缓存
          this.clearScreenshotCache(userId);
        }
      )
      .subscribe();
  }

  subscribeToAnalysis(userId: string, callback: (payload: any) => void) {
    return this.client
      .channel(`analysis_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_TABLES.ACTIVITY_ANALYSES,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload);
          // 清除相关缓存
          this.clearAnalysisCache(userId);
        }
      )
      .subscribe();
  }

  // 缓存清理方法
  private clearDeviceCache(userId: string): void {
    const keys = Array.from(requestCache.keys()).filter(key => key.startsWith(`devices_${userId}`));
    keys.forEach(key => requestCache.delete(key));
  }

  private clearScreenshotCache(userId: string): void {
    const keys = Array.from(requestCache.keys()).filter(key => key.startsWith(`screenshots_${userId}`));
    keys.forEach(key => requestCache.delete(key));
  }

  private clearAnalysisCache(userId: string): void {
    const keys = Array.from(requestCache.keys()).filter(key => key.startsWith(`analyses_${userId}`));
    keys.forEach(key => requestCache.delete(key));
  }

  private clearSessionCache(userId: string): void {
    const keys = Array.from(requestCache.keys()).filter(key => key.startsWith(`sessions_${userId}`));
    keys.forEach(key => requestCache.delete(key));
  }

  private clearNotificationCache(userId: string): void {
    const keys = Array.from(requestCache.keys()).filter(key => key.startsWith(`notifications_${userId}`));
    keys.forEach(key => requestCache.delete(key));
  }

  /**
   * 清理所有缓存
   */
  clearAllCache(): void {
    requestCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: requestCache.size,
      keys: Array.from(requestCache.keys())
    };
  }
}
