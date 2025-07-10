import { z } from 'zod';
import { ACTIVITY_TYPES, NOTIFICATION_TYPES, ACHIEVEMENT_TYPES } from '../constants';

// 基础验证模式
export const emailSchema = z.string().email('请输入有效的邮箱地址');
export const passwordSchema = z.string().min(6, '密码至少需要6个字符');
export const uuidSchema = z.string().uuid('无效的UUID格式');

// 活动类型验证
export const activityTypeSchema = z.enum([
  ACTIVITY_TYPES.LEARNING,
  ACTIVITY_TYPES.ENTERTAINMENT,
  ACTIVITY_TYPES.WORK,
  ACTIVITY_TYPES.SOCIAL,
  ACTIVITY_TYPES.OTHER,
]);

// 用户设置验证
export const userSettingsSchema = z.object({
  screenshot_interval: z.number().min(5).max(60).default(15),
  auto_analysis: z.boolean().default(true),
  notifications_enabled: z.boolean().default(true),
  learning_goals: z.array(z.object({
    id: uuidSchema,
    title: z.string().min(1, '目标标题不能为空'),
    target_hours_per_day: z.number().min(0.5).max(24),
    subjects: z.array(z.string()),
    created_at: z.string(),
    is_active: z.boolean(),
  })).default([]),
  privacy_mode: z.boolean().default(false),
});

// 设备验证
export const deviceSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  device_name: z.string().min(1, '设备名称不能为空'),
  device_type: z.enum(['desktop', 'mobile']),
  platform: z.enum(['windows', 'mac', 'ios', 'android']),
  last_active: z.string().optional(),
  created_at: z.string().optional(),
});

// 截图验证
export const screenshotSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  device_id: uuidSchema,
  file_path: z.string().min(1, '文件路径不能为空'),
  captured_at: z.string(),
  analysis_status: z.enum(['pending', 'analyzing', 'completed', 'failed']).default('pending'),
  created_at: z.string().optional(),
});

// 活动分析验证
export const activityAnalysisSchema = z.object({
  id: uuidSchema.optional(),
  screenshot_id: uuidSchema,
  activity_type: activityTypeSchema,
  confidence_score: z.number().min(0).max(1),
  description: z.string().min(1, '描述不能为空'),
  tags: z.array(z.string()).default([]),
  learning_subject: z.string().optional(),
  productivity_score: z.number().int().min(1).max(10),
  ai_model_used: z.string().min(1, 'AI模型名称不能为空'),
  analysis_time: z.string(),
  created_at: z.string().optional(),
});

// 学习会话验证
export const learningSessionSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  start_time: z.string(),
  end_time: z.string().optional(),
  total_duration: z.number().optional(),
  subject: z.string().optional(),
  productivity_score: z.number().min(0).max(10).optional(),
  screenshot_count: z.number().int().min(0).default(0),
  created_at: z.string().optional(),
});

// 通知验证
export const notificationSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  type: z.enum([
    NOTIFICATION_TYPES.REMINDER,
    NOTIFICATION_TYPES.ACHIEVEMENT,
    NOTIFICATION_TYPES.GOAL_PROGRESS,
    NOTIFICATION_TYPES.SYSTEM,
  ]),
  title: z.string().min(1, '通知标题不能为空'),
  message: z.string().min(1, '通知内容不能为空'),
  is_read: z.boolean().default(false),
  created_at: z.string().optional(),
  scheduled_for: z.string().optional(),
});

// 成就验证
export const achievementSchema = z.object({
  id: uuidSchema.optional(),
  title: z.string().min(1, '成就标题不能为空'),
  description: z.string().min(1, '成就描述不能为空'),
  icon: z.string().min(1, '成就图标不能为空'),
  earned_at: z.string(),
  type: z.enum([
    ACHIEVEMENT_TYPES.LEARNING_TIME,
    ACHIEVEMENT_TYPES.PRODUCTIVITY,
    ACHIEVEMENT_TYPES.CONSISTENCY,
    ACHIEVEMENT_TYPES.SUBJECT_MASTERY,
  ]),
});

// Gemini分析请求验证
export const geminiAnalysisRequestSchema = z.object({
  image_base64: z.string().min(1, '图片数据不能为空'),
  prompt: z.string().optional(),
  model: z.string().optional(),
});

// Gemini分析响应验证
export const geminiAnalysisResponseSchema = z.object({
  activity_type: activityTypeSchema,
  confidence_score: z.number().min(0).max(1),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  learning_subject: z.string().optional(),
  productivity_score: z.number().int().min(1).max(10),
  reasoning: z.string().min(1),
});

// API响应验证
export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

// 统计数据验证
export const dailyStatsSchema = z.object({
  date: z.string(),
  total_screenshots: z.number().int().min(0),
  learning_time: z.number().min(0),
  productivity_score: z.number().min(0).max(10),
  top_activities: z.array(z.object({
    activity_type: activityTypeSchema,
    duration: z.number().min(0),
    percentage: z.number().min(0).max(100),
    productivity_score: z.number().min(0).max(10),
  })),
  learning_subjects: z.array(z.string()),
});

export const weeklyReportSchema = z.object({
  week_start: z.string(),
  week_end: z.string(),
  daily_stats: z.array(dailyStatsSchema),
  total_learning_time: z.number().min(0),
  average_productivity: z.number().min(0).max(10),
  learning_streak: z.number().int().min(0),
  achievements: z.array(achievementSchema),
});

// 应用配置验证
export const appConfigSchema = z.object({
  supabase: z.object({
    url: z.string().url('无效的Supabase URL'),
    anon_key: z.string().min(1, 'Supabase匿名密钥不能为空'),
  }),
  gemini: z.object({
    api_key: z.string().min(1, 'Gemini API密钥不能为空'),
    models: z.array(z.object({
      name: z.string().min(1),
      endpoint: z.string().url(),
      max_requests_per_minute: z.number().int().min(1),
      last_used: z.string(),
      error_count: z.number().int().min(0),
    })),
  }),
  app: z.object({
    name: z.string().min(1),
    version: z.string().min(1),
    environment: z.enum(['development', 'production']),
  }),
});

// 提醒设置验证
export const reminderSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  break_reminder_interval: z.number().int().min(15).max(240).default(60),
  learning_goal_reminder: z.boolean().default(true),
  daily_summary_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '时间格式应为HH:mm').default('21:00'),
  weekly_report_day: z.number().int().min(0).max(6).default(0),
});

// 验证工具函数
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['验证失败'] };
  }
};

// 安全验证数据（返回验证后的数据或默认值）
export const safeValidateData = <T>(schema: z.ZodSchema<T>, data: unknown, defaultValue: T): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    console.warn('数据验证失败，使用默认值:', error);
    return defaultValue;
  }
};
