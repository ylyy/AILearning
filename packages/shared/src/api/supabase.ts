import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DB_TABLES, STORAGE_BUCKETS } from '../constants';
import type {
  ActivityAnalysis,
  ApiResponse,
  Device,
  LearningSession,
  Notification,
  Screenshot,
  User
} from '../types';

export class SupabaseAPI {
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
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

      // 转换 Supabase User 到我们的 User 类型
      if (!data.user) {
        return { success: false, error: '用户数据为空' };
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        created_at: data.user.created_at,
        updated_at: data.user.updated_at || data.user.created_at,
        settings: {
          screenshot_interval: 5,
          auto_analysis: true,
          notifications_enabled: true,
          learning_goals: [],
          privacy_mode: false
        }
      };
      return { success: true, data: user };
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

      // 转换 Supabase User 到我们的 User 类型
      if (!data.user) {
        return { success: false, error: '用户数据为空' };
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        created_at: data.user.created_at,
        updated_at: data.user.updated_at || data.user.created_at,
        settings: {
          screenshot_interval: 5,
          auto_analysis: true,
          notifications_enabled: true,
          learning_goals: [],
          privacy_mode: false
        }
      };
      return { success: true, data: user };
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

  // 设备管理
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

      return { success: true, data };
    } catch (error) {
      return { success: false, error: '创建设备失败' };
    }
  }

  async getDevices(userId: string): Promise<ApiResponse<Device[]>> {
    try {
      const { data, error } = await this.client
        .from(DB_TABLES.DEVICES)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
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

  // 截图管理
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

      return { success: true, data };
    } catch (error) {
      return { success: false, error: '创建截图记录失败' };
    }
  }

  async getScreenshots(userId: string, limit: number = 50): Promise<ApiResponse<Screenshot[]>> {
    try {
      const { data, error } = await this.client
        .from(DB_TABLES.SCREENSHOTS)
        .select('*')
        .eq('user_id', userId)
        .order('captured_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
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

  // 活动分析
  async createActivityAnalysis(analysis: Omit<ActivityAnalysis, 'id' | 'created_at'>): Promise<ApiResponse<ActivityAnalysis>> {
    try {
      const { data, error } = await this.client
        .from(DB_TABLES.ACTIVITY_ANALYSIS)
        .insert(analysis)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

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
      let query = this.client
        .from(DB_TABLES.ACTIVITY_ANALYSIS)
        .select(`
          *,
          screenshots!inner(user_id, captured_at)
        `)
        .eq('screenshots.user_id', userId)
        .order('analysis_time', { ascending: false });

      if (startDate) {
        query = query.gte('screenshots.captured_at', startDate);
      }

      if (endDate) {
        query = query.lte('screenshots.captured_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: '获取活动分析失败' };
    }
  }

  // 学习会话
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

      return { success: true, data };
    } catch (error) {
      return { success: false, error: '更新学习会话失败' };
    }
  }

  // 通知管理
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

      return { success: true, data };
    } catch (error) {
      return { success: false, error: '创建通知失败' };
    }
  }

  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<ApiResponse<Notification[]>> {
    try {
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

      return { success: true, data: data || [] };
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

  // 获取公共URL
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // 实时订阅
  subscribeToScreenshots(userId: string, callback: (payload: any) => void) {
    return this.client
      .channel('screenshots')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_TABLES.SCREENSHOTS,
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }

  subscribeToAnalysis(userId: string, callback: (payload: any) => void) {
    return this.client
      .channel('analysis')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_TABLES.ACTIVITY_ANALYSIS,
        },
        callback
      )
      .subscribe();
  }
}
