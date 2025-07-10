import { ActivityAnalysis, DailyStats, LearningGoal } from '../types';
import { AnalyticsService } from './AnalyticsService';

export interface SupervisionRule {
  id: string;
  name: string;
  description: string;
  condition: (data: SupervisionData) => boolean;
  action: (data: SupervisionData) => SupervisionAction;
  priority: 'low' | 'medium' | 'high';
  cooldown: number; // 冷却时间（分钟）
  enabled: boolean;
}

export interface SupervisionData {
  recentAnalyses: ActivityAnalysis[];
  dailyStats: DailyStats[];
  learningGoals: LearningGoal[];
  currentTime: Date;
  lastNotificationTime?: Date;
}

export interface SupervisionAction {
  type: 'notification' | 'reminder' | 'encouragement' | 'warning';
  title: string;
  message: string;
  actionButton?: {
    text: string;
    action: string;
  };
  priority: 'low' | 'medium' | 'high';
  scheduledFor?: Date;
}

export class SupervisionService {
  private rules: SupervisionRule[] = [];
  private lastExecutionTimes: Map<string, Date> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认督促规则
   */
  private initializeDefaultRules(): void {
    this.rules = [
      // 学习时间不足提醒
      {
        id: 'insufficient_learning_time',
        name: '学习时间不足提醒',
        description: '当日学习时间少于目标时间的50%时提醒',
        condition: (data) => {
          const today = data.currentTime.toISOString().split('T')[0];
          const todayStats = data.dailyStats.find(s => s.date === today);
          const todayGoal = data.learningGoals.find(g => g.is_active);
          
          if (!todayStats || !todayGoal) return false;
          
          const targetMinutes = todayGoal.target_hours_per_day * 60;
          const currentMinutes = todayStats.learning_time;
          const progress = currentMinutes / targetMinutes;
          
          // 如果已经过了下午6点，且进度不足50%
          return data.currentTime.getHours() >= 18 && progress < 0.5;
        },
        action: (data) => {
          const today = data.currentTime.toISOString().split('T')[0];
          const todayStats = data.dailyStats.find(s => s.date === today);
          const todayGoal = data.learningGoals.find(g => g.is_active);
          
          const targetMinutes = todayGoal!.target_hours_per_day * 60;
          const currentMinutes = todayStats!.learning_time;
          const remainingMinutes = targetMinutes - currentMinutes;
          
          return {
            type: 'reminder',
            title: '学习目标提醒',
            message: `今天还需要学习${Math.round(remainingMinutes / 60 * 10) / 10}小时才能完成目标"${todayGoal!.title}"`,
            actionButton: {
              text: '开始学习',
              action: 'start_learning',
            },
            priority: 'medium',
          };
        },
        priority: 'medium',
        cooldown: 120, // 2小时冷却
        enabled: true,
      },

      // 长时间无学习活动警告
      {
        id: 'no_learning_activity',
        name: '无学习活动警告',
        description: '连续2小时无学习活动时警告',
        condition: (data) => {
          const twoHoursAgo = new Date(data.currentTime.getTime() - 2 * 60 * 60 * 1000);
          const recentLearning = data.recentAnalyses.filter(a => 
            a.activity_type === 'learning' && 
            new Date(a.analysis_time) > twoHoursAgo
          );
          
          return recentLearning.length === 0 && data.currentTime.getHours() >= 9 && data.currentTime.getHours() <= 21;
        },
        action: () => ({
          type: 'reminder',
          title: '学习提醒',
          message: '您已经2小时没有学习了，是时候开始学习了！',
          actionButton: {
            text: '查看学习计划',
            action: 'view_learning_plan',
          },
          priority: 'medium',
        }),
        priority: 'medium',
        cooldown: 60, // 1小时冷却
        enabled: true,
      },

      // 娱乐时间过长警告
      {
        id: 'excessive_entertainment',
        name: '娱乐时间过长警告',
        description: '连续1小时娱乐活动时警告',
        condition: (data) => {
          const oneHourAgo = new Date(data.currentTime.getTime() - 60 * 60 * 1000);
          const recentEntertainment = data.recentAnalyses.filter(a => 
            a.activity_type === 'entertainment' && 
            new Date(a.analysis_time) > oneHourAgo
          );
          
          return recentEntertainment.length >= 4; // 4个15分钟 = 1小时
        },
        action: () => ({
          type: 'warning',
          title: '娱乐时间提醒',
          message: '您已经娱乐了1小时，建议适当休息或开始学习。',
          actionButton: {
            text: '开始学习',
            action: 'start_learning',
          },
          priority: 'low',
        }),
        priority: 'low',
        cooldown: 30, // 30分钟冷却
        enabled: true,
      },

      // 学习效率低下提醒
      {
        id: 'low_productivity',
        name: '学习效率低下提醒',
        description: '最近学习效率低于平均水平时提醒',
        condition: (data) => {
          const recentLearning = data.recentAnalyses
            .filter(a => a.activity_type === 'learning')
            .slice(-8); // 最近2小时的学习活动
          
          if (recentLearning.length < 4) return false;
          
          const avgProductivity = recentLearning.reduce((sum, a) => sum + a.productivity_score, 0) / recentLearning.length;
          return avgProductivity < 6;
        },
        action: () => ({
          type: 'reminder',
          title: '学习效率提醒',
          message: '检测到学习效率较低，建议调整学习环境或方法，或者适当休息。',
          actionButton: {
            text: '查看建议',
            action: 'view_productivity_tips',
          },
          priority: 'medium',
        }),
        priority: 'medium',
        cooldown: 90, // 1.5小时冷却
        enabled: true,
      },

      // 目标完成鼓励
      {
        id: 'goal_achievement',
        name: '目标完成鼓励',
        description: '完成学习目标时给予鼓励',
        condition: (data) => {
          const today = data.currentTime.toISOString().split('T')[0];
          const todayStats = data.dailyStats.find(s => s.date === today);
          const todayGoal = data.learningGoals.find(g => g.is_active);
          
          if (!todayStats || !todayGoal) return false;
          
          const targetMinutes = todayGoal.target_hours_per_day * 60;
          const currentMinutes = todayStats.learning_time;
          
          return currentMinutes >= targetMinutes;
        },
        action: (data) => {
          const todayGoal = data.learningGoals.find(g => g.is_active);
          return {
            type: 'encouragement',
            title: '🎉 目标达成！',
            message: `恭喜！您已经完成了今天的学习目标"${todayGoal!.title}"，继续保持！`,
            priority: 'high',
          };
        },
        priority: 'high',
        cooldown: 1440, // 24小时冷却（每天只提醒一次）
        enabled: true,
      },

      // 学习连续性鼓励
      {
        id: 'learning_streak',
        name: '学习连续性鼓励',
        description: '连续学习天数达到里程碑时鼓励',
        condition: (data) => {
          const streak = this.calculateCurrentStreak(data.dailyStats);
          return [3, 7, 14, 30, 60, 100].includes(streak);
        },
        action: (data) => {
          const streak = this.calculateCurrentStreak(data.dailyStats);
          return {
            type: 'encouragement',
            title: '🔥 学习连击！',
            message: `太棒了！您已经连续学习${streak}天，坚持就是胜利！`,
            priority: 'high',
          };
        },
        priority: 'high',
        cooldown: 1440, // 24小时冷却
        enabled: true,
      },

      // 休息提醒
      {
        id: 'break_reminder',
        name: '休息提醒',
        description: '连续学习2小时后提醒休息',
        condition: (data) => {
          const twoHoursAgo = new Date(data.currentTime.getTime() - 2 * 60 * 60 * 1000);
          const recentLearning = data.recentAnalyses.filter(a => 
            a.activity_type === 'learning' && 
            new Date(a.analysis_time) > twoHoursAgo
          );
          
          return recentLearning.length >= 8; // 8个15分钟 = 2小时
        },
        action: () => ({
          type: 'reminder',
          title: '休息提醒',
          message: '您已经连续学习2小时了，建议休息10-15分钟，保护眼睛和大脑。',
          actionButton: {
            text: '开始休息',
            action: 'start_break',
          },
          priority: 'medium',
        }),
        priority: 'medium',
        cooldown: 120, // 2小时冷却
        enabled: true,
      },
    ];
  }

  /**
   * 执行督促检查
   */
  checkSupervision(data: SupervisionData): SupervisionAction[] {
    const actions: SupervisionAction[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // 检查冷却时间
      const lastExecution = this.lastExecutionTimes.get(rule.id);
      if (lastExecution) {
        const timeSinceLastExecution = data.currentTime.getTime() - lastExecution.getTime();
        const cooldownMs = rule.cooldown * 60 * 1000;
        
        if (timeSinceLastExecution < cooldownMs) {
          continue; // 还在冷却期内
        }
      }

      // 检查条件
      try {
        if (rule.condition(data)) {
          const action = rule.action(data);
          actions.push(action);
          
          // 记录执行时间
          this.lastExecutionTimes.set(rule.id, data.currentTime);
        }
      } catch (error) {
        console.error(`Error executing supervision rule ${rule.id}:`, error);
      }
    }

    // 按优先级排序
    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 计算当前学习连续天数
   */
  private calculateCurrentStreak(dailyStats: DailyStats[]): number {
    let streak = 0;
    const sortedStats = dailyStats
      .sort((a, b) => b.date.localeCompare(a.date));

    for (const stat of sortedStats) {
      if (stat.learning_time > 0) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: SupervisionRule): void {
    this.rules.push(rule);
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * 启用/禁用规则
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * 获取所有规则
   */
  getRules(): SupervisionRule[] {
    return [...this.rules];
  }

  /**
   * 重置冷却时间
   */
  resetCooldown(ruleId: string): void {
    this.lastExecutionTimes.delete(ruleId);
  }

  /**
   * 生成个性化建议
   */
  generatePersonalizedSuggestions(data: SupervisionData): string[] {
    const patterns = AnalyticsService.analyzeLearningPatterns(data.recentAnalyses);
    const suggestions = AnalyticsService.generateLearningRecommendations(patterns, data.dailyStats);
    
    // 添加基于当前状态的建议
    const currentHour = data.currentTime.getHours();
    
    if (patterns.peakHours.includes(currentHour)) {
      suggestions.unshift('现在是您的学习高峰时段，建议专注于重要的学习任务。');
    }
    
    if (currentHour >= 22) {
      suggestions.push('时间较晚，建议适当休息，保证充足睡眠。');
    }
    
    return suggestions;
  }
}
