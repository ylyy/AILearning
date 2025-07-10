// 用户相关类型
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  settings: UserSettings;
}

export interface UserSettings {
  screenshot_interval: number; // 截图间隔（分钟）
  auto_analysis: boolean; // 自动分析开关
  notifications_enabled: boolean; // 通知开关
  learning_goals: LearningGoal[];
  privacy_mode: boolean; // 隐私模式
}

export interface LearningGoal {
  id: string;
  title: string;
  target_hours_per_day: number;
  subjects: string[];
  created_at: string;
  is_active: boolean;
}

// 设备相关类型
export interface Device {
  id: string;
  user_id: string;
  device_name: string;
  device_type: 'desktop' | 'mobile';
  platform: 'windows' | 'mac' | 'ios' | 'android';
  last_active: string;
  created_at: string;
}

// 截图相关类型
export interface Screenshot {
  id: string;
  user_id: string;
  device_id: string;
  file_path: string;
  captured_at: string;
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  created_at: string;
}

// AI分析相关类型
export interface ActivityAnalysis {
  id: string;
  screenshot_id: string;
  activity_type: ActivityType;
  confidence_score: number; // 0-1
  description: string;
  tags: string[];
  learning_subject?: string;
  productivity_score: number; // 1-10
  ai_model_used: string;
  analysis_time: string;
  created_at: string;
}

export type ActivityType = 'learning' | 'entertainment' | 'work' | 'social' | 'other';

// 学习会话类型
export interface LearningSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  total_duration?: number; // 秒
  subject?: string;
  productivity_score?: number;
  screenshot_count: number;
  created_at: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Gemini API相关类型
export interface GeminiModel {
  name: string;
  endpoint: string;
  max_requests_per_minute: number;
  last_used: string;
  error_count: number;
}

export interface GeminiAnalysisRequest {
  image_base64: string;
  prompt: string;
  model?: string;
}

export interface GeminiAnalysisResponse {
  activity_type: ActivityType;
  confidence_score: number;
  description: string;
  tags: string[];
  learning_subject?: string;
  productivity_score: number;
  reasoning: string;
}

// 统计和报告类型
export interface DailyStats {
  date: string;
  total_screenshots: number;
  learning_time: number; // 分钟
  productivity_score: number;
  top_activities: ActivitySummary[];
  learning_subjects: string[];
}

export interface ActivitySummary {
  activity_type: ActivityType;
  duration: number; // 分钟
  percentage: number;
  productivity_score: number;
}

export interface WeeklyReport {
  week_start: string;
  week_end: string;
  daily_stats: DailyStats[];
  total_learning_time: number;
  average_productivity: number;
  learning_streak: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned_at: string;
  type: 'learning_time' | 'productivity' | 'consistency' | 'subject_mastery';
}

// 通知和提醒类型
export interface Notification {
  id: string;
  user_id: string;
  type: 'reminder' | 'achievement' | 'goal_progress' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  scheduled_for?: string;
}

export interface ReminderSettings {
  enabled: boolean;
  break_reminder_interval: number; // 分钟
  learning_goal_reminder: boolean;
  daily_summary_time: string; // HH:mm
  weekly_report_day: number; // 0-6 (周日到周六)
}

// 错误类型
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// 配置类型
export interface AppConfig {
  supabase: {
    url: string;
    anon_key: string;
  };
  gemini: {
    api_key: string;
    models: GeminiModel[];
  };
  app: {
    name: string;
    version: string;
    environment: 'development' | 'production';
  };
}
