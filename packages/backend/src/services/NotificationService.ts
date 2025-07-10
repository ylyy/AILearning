import { SupabaseClient } from '@supabase/supabase-js';
import * as cron from 'node-cron';
import { logger } from '../utils/logger';

export class NotificationService {
  private supabase: SupabaseClient;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * 启动定时通知检查
   */
  startScheduledNotifications(): void {
    logger.info('Starting scheduled notification service');

    // 每分钟检查一次需要发送的通知
    const notificationTask = cron.schedule('* * * * *', () => {
      this.checkScheduledNotifications();
    });

    // 每小时检查学习目标进度
    const goalProgressTask = cron.schedule('0 * * * *', () => {
      this.checkLearningGoalProgress();
    });

    // 每天晚上9点发送日报
    const dailySummaryTask = cron.schedule('0 21 * * *', () => {
      this.sendDailySummaries();
    });

    // 每周日晚上发送周报
    const weeklySummaryTask = cron.schedule('0 21 * * 0', () => {
      this.sendWeeklySummaries();
    });

    this.scheduledTasks.set('notifications', notificationTask);
    this.scheduledTasks.set('goalProgress', goalProgressTask);
    this.scheduledTasks.set('dailySummary', dailySummaryTask);
    this.scheduledTasks.set('weeklySummary', weeklySummaryTask);
  }

  /**
   * 停止定时通知
   */
  stopScheduledNotifications(): void {
    logger.info('Stopping scheduled notification service');
    
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.debug(`Stopped scheduled task: ${name}`);
    });
    
    this.scheduledTasks.clear();
  }

  /**
   * 检查需要发送的定时通知
   */
  private async checkScheduledNotifications(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const { data: notifications, error } = await this.supabase
        .from('notifications')
        .select('*')
        .lte('scheduled_for', now)
        .eq('is_read', false)
        .not('scheduled_for', 'is', null);

      if (error) {
        logger.error('Failed to fetch scheduled notifications:', error);
        return;
      }

      for (const notification of notifications || []) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      logger.error('Error checking scheduled notifications:', error);
    }
  }

  /**
   * 检查学习目标进度
   */
  private async checkLearningGoalProgress(): Promise<void> {
    try {
      // 获取所有活跃用户的学习目标
      const { data: userSettings, error } = await this.supabase
        .from('user_settings')
        .select('user_id, learning_goals')
        .not('learning_goals', 'eq', '[]');

      if (error) {
        logger.error('Failed to fetch user learning goals:', error);
        return;
      }

      for (const settings of userSettings || []) {
        await this.checkUserGoalProgress(settings.user_id, settings.learning_goals);
      }
    } catch (error) {
      logger.error('Error checking learning goal progress:', error);
    }
  }

  /**
   * 检查单个用户的学习目标进度
   */
  private async checkUserGoalProgress(userId: string, goals: any[]): Promise<void> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // 获取今天的学习时间
      const { data: todayAnalysis, error } = await this.supabase
        .from('activity_analysis')
        .select(`
          *,
          screenshots!inner(user_id, captured_at)
        `)
        .eq('screenshots.user_id', userId)
        .eq('activity_type', 'learning')
        .gte('screenshots.captured_at', todayStart)
        .lt('screenshots.captured_at', todayEnd);

      if (error) {
        logger.error(`Failed to fetch today's learning data for user ${userId}:`, error);
        return;
      }

      const todayLearningMinutes = (todayAnalysis?.length || 0) * 15; // 每个截图代表15分钟

      for (const goal of goals) {
        if (!goal.is_active) continue;

        const targetMinutes = goal.target_hours_per_day * 60;
        const progressPercentage = Math.round((todayLearningMinutes / targetMinutes) * 100);

        // 如果进度低于50%且已经过了下午6点，发送提醒
        if (progressPercentage < 50 && today.getHours() >= 18) {
          await this.createNotification({
            user_id: userId,
            type: 'goal_progress',
            title: '学习目标提醒',
            message: `今天的学习目标"${goal.title}"进度为${progressPercentage}%，还需要${Math.round((targetMinutes - todayLearningMinutes) / 60)}小时才能完成目标。`,
          });
        }

        // 如果超额完成目标，发送鼓励
        if (progressPercentage >= 100) {
          await this.createNotification({
            user_id: userId,
            type: 'achievement',
            title: '目标达成！',
            message: `恭喜！您已经完成了今天的学习目标"${goal.title}"，继续保持！`,
          });
        }
      }
    } catch (error) {
      logger.error(`Error checking goal progress for user ${userId}:`, error);
    }
  }

  /**
   * 发送日报
   */
  private async sendDailySummaries(): Promise<void> {
    try {
      // 获取所有启用通知的用户
      const { data: users, error } = await this.supabase
        .from('user_settings')
        .select('user_id')
        .eq('notifications_enabled', true);

      if (error) {
        logger.error('Failed to fetch users for daily summary:', error);
        return;
      }

      for (const user of users || []) {
        await this.generateDailySummary(user.user_id);
      }
    } catch (error) {
      logger.error('Error sending daily summaries:', error);
    }
  }

  /**
   * 生成用户日报
   */
  private async generateDailySummary(userId: string): Promise<void> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // 获取今天的活动分析
      const { data: todayAnalysis, error } = await this.supabase
        .from('activity_analysis')
        .select(`
          *,
          screenshots!inner(user_id, captured_at)
        `)
        .eq('screenshots.user_id', userId)
        .gte('screenshots.captured_at', todayStart)
        .lt('screenshots.captured_at', todayEnd);

      if (error) {
        logger.error(`Failed to fetch daily analysis for user ${userId}:`, error);
        return;
      }

      if (!todayAnalysis || todayAnalysis.length === 0) {
        return; // 没有数据就不发送日报
      }

      // 统计数据
      const totalScreenshots = todayAnalysis.length;
      const learningScreenshots = todayAnalysis.filter(a => a.activity_type === 'learning').length;
      const learningTime = Math.round((learningScreenshots * 15) / 60 * 10) / 10; // 小时，保留1位小数
      const avgProductivity = Math.round(
        todayAnalysis.reduce((sum, a) => sum + a.productivity_score, 0) / totalScreenshots
      );

      // 最常见的活动类型
      const activityCounts = todayAnalysis.reduce((acc, a) => {
        acc[a.activity_type] = (acc[a.activity_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topActivity = Object.entries(activityCounts)
        .sort(([,a], [,b]) => b - a)[0];

      const message = `📊 今日学习报告
🕐 总监控时间: ${Math.round(totalScreenshots * 15 / 60 * 10) / 10}小时
📚 学习时间: ${learningTime}小时
📈 平均生产力: ${avgProductivity}/10
🎯 主要活动: ${this.getActivityLabel(topActivity[0])} (${Math.round(topActivity[1] / totalScreenshots * 100)}%)

${learningTime >= 2 ? '🎉 今天的学习时间很充足，继续保持！' : '💪 明天可以增加一些学习时间哦！'}`;

      await this.createNotification({
        user_id: userId,
        type: 'system',
        title: '今日学习报告',
        message,
      });
    } catch (error) {
      logger.error(`Error generating daily summary for user ${userId}:`, error);
    }
  }

  /**
   * 发送周报
   */
  private async sendWeeklySummaries(): Promise<void> {
    // 类似日报的逻辑，但统计一周的数据
    logger.info('Sending weekly summaries (placeholder)');
  }

  /**
   * 创建通知
   */
  async createNotification(notification: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    scheduled_for?: string;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .insert(notification);

      if (error) {
        logger.error('Failed to create notification:', error);
      } else {
        logger.info(`Created notification for user ${notification.user_id}: ${notification.title}`);
      }
    } catch (error) {
      logger.error('Error creating notification:', error);
    }
  }

  /**
   * 发送通知（这里可以集成推送服务）
   */
  private async sendNotification(notification: any): Promise<void> {
    try {
      // 这里可以集成实际的推送服务，比如Firebase、APNs等
      // 现在只是标记为已读
      await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      logger.info(`Sent notification: ${notification.title} to user ${notification.user_id}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  /**
   * 获取活动类型的中文标签
   */
  private getActivityLabel(activityType: string): string {
    const labels: Record<string, string> = {
      learning: '学习',
      work: '工作',
      entertainment: '娱乐',
      social: '社交',
      other: '其他',
    };
    return labels[activityType] || activityType;
  }
}
