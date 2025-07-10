// Gemini API配置
export const GEMINI_CONFIG = {
  API_KEY: 'AIzaSyBCDH1WrB7ElqMZQk26PoJVVGVORXPfVrE',
  MODELS: [
    {
      name: 'gemini-2.5-flash',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      max_requests_per_minute: 15,
      last_used: '',
      error_count: 0,
    },
    {
      name: 'gemini-2.5-flash-preview-04-17',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent',
      max_requests_per_minute: 15,
      last_used: '',
      error_count: 0,
    },
    {
      name: 'gemini-2.5-flash-lite-preview-06-17',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent',
      max_requests_per_minute: 15,
      last_used: '',
      error_count: 0,
    },
  ],
};

// 应用配置
export const APP_CONFIG = {
  NAME: 'Learning Supervisor',
  VERSION: '1.0.0',
  SCREENSHOT_INTERVAL: 15, // 分钟
  MAX_SCREENSHOT_SIZE: 2 * 1024 * 1024, // 2MB
  SUPPORTED_IMAGE_FORMATS: ['png', 'jpg', 'jpeg'],
  MAX_RETRY_ATTEMPTS: 3,
  API_TIMEOUT: 30000, // 30秒
};

// 活动类型配置
export const ACTIVITY_TYPES = {
  LEARNING: 'learning',
  ENTERTAINMENT: 'entertainment',
  WORK: 'work',
  SOCIAL: 'social',
  OTHER: 'other',
} as const;

// 活动类型中文映射
export const ACTIVITY_TYPE_LABELS = {
  [ACTIVITY_TYPES.LEARNING]: '学习',
  [ACTIVITY_TYPES.ENTERTAINMENT]: '娱乐',
  [ACTIVITY_TYPES.WORK]: '工作',
  [ACTIVITY_TYPES.SOCIAL]: '社交',
  [ACTIVITY_TYPES.OTHER]: '其他',
};

// 学习科目预设
export const LEARNING_SUBJECTS = [
  '编程开发',
  '前端技术',
  '后端技术',
  '移动开发',
  '数据科学',
  '人工智能',
  '机器学习',
  '算法数据结构',
  '系统设计',
  '数据库',
  '网络安全',
  '云计算',
  'DevOps',
  '产品设计',
  '用户体验',
  '项目管理',
  '英语学习',
  '数学',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '经济学',
  '心理学',
  '哲学',
  '文学',
  '艺术',
  '音乐',
  '其他',
];

// 生产力评分标准
export const PRODUCTIVITY_SCORES = {
  VERY_LOW: 1,
  LOW: 3,
  MEDIUM: 5,
  HIGH: 7,
  VERY_HIGH: 9,
};

// 生产力评分描述
export const PRODUCTIVITY_DESCRIPTIONS = {
  [PRODUCTIVITY_SCORES.VERY_LOW]: '非常低效',
  [PRODUCTIVITY_SCORES.LOW]: '低效',
  [PRODUCTIVITY_SCORES.MEDIUM]: '一般',
  [PRODUCTIVITY_SCORES.HIGH]: '高效',
  [PRODUCTIVITY_SCORES.VERY_HIGH]: '非常高效',
};

// 通知类型
export const NOTIFICATION_TYPES = {
  REMINDER: 'reminder',
  ACHIEVEMENT: 'achievement',
  GOAL_PROGRESS: 'goal_progress',
  SYSTEM: 'system',
} as const;

// 成就类型
export const ACHIEVEMENT_TYPES = {
  LEARNING_TIME: 'learning_time',
  PRODUCTIVITY: 'productivity',
  CONSISTENCY: 'consistency',
  SUBJECT_MASTERY: 'subject_mastery',
} as const;

// 默认用户设置
export const DEFAULT_USER_SETTINGS = {
  screenshot_interval: 15,
  auto_analysis: true,
  notifications_enabled: true,
  learning_goals: [],
  privacy_mode: false,
};

// 默认提醒设置
export const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  break_reminder_interval: 60,
  learning_goal_reminder: true,
  daily_summary_time: '21:00',
  weekly_report_day: 0, // 周日
};

// API端点
export const API_ENDPOINTS = {
  SCREENSHOTS: '/screenshots',
  ANALYSIS: '/analysis',
  SESSIONS: '/sessions',
  STATS: '/stats',
  NOTIFICATIONS: '/notifications',
  USERS: '/users',
  DEVICES: '/devices',
};

// 错误代码
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  AI_ANALYSIS_ERROR: 'AI_ANALYSIS_ERROR',
  SCREENSHOT_ERROR: 'SCREENSHOT_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
};

// 数据库表名
export const DB_TABLES = {
  USERS: 'users',
  DEVICES: 'devices',
  SCREENSHOTS: 'screenshots',
  ACTIVITY_ANALYSIS: 'activity_analysis',
  LEARNING_SESSIONS: 'learning_sessions',
  NOTIFICATIONS: 'notifications',
  ACHIEVEMENTS: 'achievements',
};

// 存储桶名称
export const STORAGE_BUCKETS = {
  SCREENSHOTS: 'screenshots',
  AVATARS: 'avatars',
};

// 文件路径模板
export const FILE_PATH_TEMPLATES = {
  SCREENSHOT: '{user_id}/{device_id}/{year}/{month}/{day}/{timestamp}.png',
  AVATAR: '{user_id}/avatar.{ext}',
};

// 时间格式
export const DATE_FORMATS = {
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
  DATE_ONLY: 'yyyy-MM-dd',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY: 'yyyy年MM月dd日 HH:mm',
  FILENAME: 'yyyyMMdd_HHmmss',
};

// 缓存键前缀
export const CACHE_KEYS = {
  USER_SETTINGS: 'user_settings_',
  DAILY_STATS: 'daily_stats_',
  WEEKLY_REPORT: 'weekly_report_',
  SCREENSHOTS: 'screenshots_',
  ANALYSIS: 'analysis_',
};
