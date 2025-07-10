import { format, parseISO, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';
import { DATE_FORMATS, FILE_PATH_TEMPLATES } from '../constants';
import type { ActivityType, Screenshot, ActivityAnalysis } from '../types';

// 日期时间工具函数
export const dateUtils = {
  /**
   * 格式化日期为显示格式
   */
  formatForDisplay: (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, DATE_FORMATS.DISPLAY);
  },

  /**
   * 格式化日期为文件名格式
   */
  formatForFilename: (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, DATE_FORMATS.FILENAME);
  },

  /**
   * 获取今天的开始和结束时间
   */
  getTodayRange: () => ({
    start: startOfDay(new Date()).toISOString(),
    end: endOfDay(new Date()).toISOString(),
  }),

  /**
   * 计算两个时间之间的分钟差
   */
  getMinutesDifference: (start: string, end: string): number => {
    return differenceInMinutes(parseISO(end), parseISO(start));
  },

  /**
   * 检查是否为今天
   */
  isToday: (date: string): boolean => {
    const today = new Date();
    const targetDate = parseISO(date);
    return format(today, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd');
  },
};

// 文件路径工具函数
export const pathUtils = {
  /**
   * 生成截图文件路径
   */
  generateScreenshotPath: (userId: string, deviceId: string, timestamp: Date): string => {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const timestampStr = dateUtils.formatForFilename(timestamp);

    return FILE_PATH_TEMPLATES.SCREENSHOT
      .replace('{user_id}', userId)
      .replace('{device_id}', deviceId)
      .replace('{year}', String(year))
      .replace('{month}', month)
      .replace('{day}', day)
      .replace('{timestamp}', timestampStr);
  },

  /**
   * 从文件路径提取信息
   */
  parseScreenshotPath: (path: string) => {
    const parts = path.split('/');
    if (parts.length >= 6) {
      return {
        userId: parts[0],
        deviceId: parts[1],
        year: parts[2],
        month: parts[3],
        day: parts[4],
        filename: parts[5],
      };
    }
    return null;
  },
};

// 图片处理工具函数
export const imageUtils = {
  /**
   * 压缩图片为base64
   */
  compressImageToBase64: async (file: File, maxSize: number = 1024 * 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 计算压缩比例
        const ratio = Math.min(800 / img.width, 600 / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 转换为base64
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        
        // 检查大小，如果还是太大就进一步压缩
        if (base64.length > maxSize) {
          const quality = maxSize / base64.length * 0.8;
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64);
        }
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  },

  /**
   * 获取图片的base64数据部分（去掉data:image/...;base64,前缀）
   */
  getBase64Data: (base64: string): string => {
    const commaIndex = base64.indexOf(',');
    return commaIndex !== -1 ? base64.substring(commaIndex + 1) : base64;
  },
};

// 数据验证工具函数
export const validationUtils = {
  /**
   * 验证邮箱格式
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * 验证活动类型
   */
  isValidActivityType: (type: string): type is ActivityType => {
    return ['learning', 'entertainment', 'work', 'social', 'other'].includes(type);
  },

  /**
   * 验证生产力评分
   */
  isValidProductivityScore: (score: number): boolean => {
    return Number.isInteger(score) && score >= 1 && score <= 10;
  },

  /**
   * 验证置信度分数
   */
  isValidConfidenceScore: (score: number): boolean => {
    return typeof score === 'number' && score >= 0 && score <= 1;
  },
};

// 统计计算工具函数
export const statsUtils = {
  /**
   * 计算平均值
   */
  average: (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  },

  /**
   * 计算学习时间（基于截图分析结果）
   */
  calculateLearningTime: (analyses: ActivityAnalysis[]): number => {
    const learningAnalyses = analyses.filter(a => a.activity_type === 'learning');
    return learningAnalyses.length * 15; // 每个截图代表15分钟
  },

  /**
   * 计算平均生产力评分
   */
  calculateAverageProductivity: (analyses: ActivityAnalysis[]): number => {
    if (analyses.length === 0) return 0;
    const scores = analyses.map(a => a.productivity_score);
    return statsUtils.average(scores);
  },

  /**
   * 按活动类型分组统计
   */
  groupByActivityType: (analyses: ActivityAnalysis[]) => {
    const groups: Record<ActivityType, ActivityAnalysis[]> = {
      learning: [],
      entertainment: [],
      work: [],
      social: [],
      other: [],
    };

    analyses.forEach(analysis => {
      groups[analysis.activity_type].push(analysis);
    });

    return groups;
  },

  /**
   * 计算学习连续天数
   */
  calculateLearningStreak: (dailyStats: Array<{ date: string; learning_time: number }>): number => {
    let streak = 0;
    const sortedStats = dailyStats.sort((a, b) => b.date.localeCompare(a.date));

    for (const stat of sortedStats) {
      if (stat.learning_time > 0) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  },
};

// 错误处理工具函数
export const errorUtils = {
  /**
   * 创建标准错误对象
   */
  createError: (code: string, message: string, details?: any) => ({
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  }),

  /**
   * 检查是否为网络错误
   */
  isNetworkError: (error: any): boolean => {
    return error?.code === 'NETWORK_ERROR' || 
           error?.message?.includes('network') ||
           error?.message?.includes('fetch');
  },

  /**
   * 格式化错误消息
   */
  formatErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return '未知错误';
  },
};

// 缓存工具函数
export const cacheUtils = {
  /**
   * 设置本地存储
   */
  setItem: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to set localStorage item:', error);
    }
  },

  /**
   * 获取本地存储
   */
  getItem: <T = any>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Failed to get localStorage item:', error);
      return null;
    }
  },

  /**
   * 删除本地存储
   */
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove localStorage item:', error);
    }
  },

  /**
   * 清空本地存储
   */
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  },
};

// 设备信息工具函数
export const deviceUtils = {
  /**
   * 获取设备类型
   */
  getDeviceType: (): 'desktop' | 'mobile' => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768 ? 'mobile' : 'desktop';
    }
    return 'desktop';
  },

  /**
   * 获取平台信息
   */
  getPlatform: (): string => {
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) return 'windows';
      if (userAgent.includes('mac')) return 'mac';
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
      if (userAgent.includes('android')) return 'android';
    }
    return 'unknown';
  },

  /**
   * 生成设备名称
   */
  generateDeviceName: (): string => {
    const platform = deviceUtils.getPlatform();
    const type = deviceUtils.getDeviceType();
    const timestamp = Date.now().toString().slice(-4);
    return `${platform}-${type}-${timestamp}`;
  },
};
