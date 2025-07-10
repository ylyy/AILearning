import { Notification, nativeImage } from 'electron';
import * as path from 'path';

export class NotificationService {
  private notificationsEnabled: boolean = true;

  constructor() {
    // 检查系统是否支持通知
    if (!Notification.isSupported()) {
      console.warn('System notifications are not supported');
      this.notificationsEnabled = false;
    }
  }

  /**
   * 显示成功通知
   */
  showSuccess(title: string, body: string): void {
    this.showNotification(title, body, 'success');
  }

  /**
   * 显示错误通知
   */
  showError(title: string, body: string): void {
    this.showNotification(title, body, 'error');
  }

  /**
   * 显示信息通知
   */
  showInfo(title: string, body: string): void {
    this.showNotification(title, body, 'info');
  }

  /**
   * 显示警告通知
   */
  showWarning(title: string, body: string): void {
    this.showNotification(title, body, 'warning');
  }

  /**
   * 显示学习提醒
   */
  showLearningReminder(message: string): void {
    this.showNotification(
      '学习提醒',
      message,
      'info',
      this.getIcon('learning')
    );
  }

  /**
   * 显示休息提醒
   */
  showBreakReminder(message: string): void {
    this.showNotification(
      '休息提醒',
      message,
      'warning',
      this.getIcon('break')
    );
  }

  /**
   * 显示成就通知
   */
  showAchievement(title: string, description: string): void {
    this.showNotification(
      `🎉 ${title}`,
      description,
      'success',
      this.getIcon('achievement')
    );
  }

  /**
   * 显示截图上传成功通知
   */
  showScreenshotUploaded(): void {
    this.showNotification(
      '截图已上传',
      '截图已成功上传并开始分析',
      'success'
    );
  }

  /**
   * 显示截图上传失败通知
   */
  showScreenshotUploadFailed(error: string): void {
    this.showNotification(
      '截图上传失败',
      `上传失败：${error}`,
      'error'
    );
  }

  /**
   * 显示监控开始通知
   */
  showMonitoringStarted(interval: number): void {
    this.showNotification(
      '监控已开始',
      `每${interval}分钟自动截图一次`,
      'info'
    );
  }

  /**
   * 显示监控停止通知
   */
  showMonitoringStopped(): void {
    this.showNotification(
      '监控已停止',
      '自动截图已停止',
      'info'
    );
  }

  /**
   * 显示网络连接错误通知
   */
  showNetworkError(): void {
    this.showNotification(
      '网络连接错误',
      '无法连接到服务器，请检查网络设置',
      'error'
    );
  }

  /**
   * 显示登录成功通知
   */
  showLoginSuccess(username: string): void {
    this.showNotification(
      '登录成功',
      `欢迎回来，${username}！`,
      'success'
    );
  }

  /**
   * 显示登录失败通知
   */
  showLoginFailed(error: string): void {
    this.showNotification(
      '登录失败',
      error,
      'error'
    );
  }

  /**
   * 显示每日学习报告
   */
  showDailyReport(stats: {
    learningTime: number;
    productivity: number;
    topActivity: string;
  }): void {
    const message = `今日学习${Math.round(stats.learningTime / 60)}小时，平均生产力${stats.productivity}/10，主要活动：${stats.topActivity}`;
    
    this.showNotification(
      '📊 今日学习报告',
      message,
      'info',
      this.getIcon('report')
    );
  }

  /**
   * 显示目标达成通知
   */
  showGoalAchieved(goalTitle: string, progress: number): void {
    this.showNotification(
      '🎯 目标达成！',
      `恭喜！您已完成"${goalTitle}"目标的${progress}%`,
      'success',
      this.getIcon('goal')
    );
  }

  /**
   * 显示目标进度提醒
   */
  showGoalProgress(goalTitle: string, progress: number, remaining: number): void {
    this.showNotification(
      '📈 目标进度提醒',
      `"${goalTitle}"已完成${progress}%，还需${remaining}小时`,
      'info',
      this.getIcon('goal')
    );
  }

  /**
   * 设置通知开关
   */
  setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }

  /**
   * 检查通知是否启用
   */
  isNotificationsEnabled(): boolean {
    return this.notificationsEnabled && Notification.isSupported();
  }

  /**
   * 显示通知的核心方法
   */
  private showNotification(
    title: string, 
    body: string, 
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    icon?: nativeImage
  ): void {
    if (!this.isNotificationsEnabled()) {
      console.log(`Notification (${type}): ${title} - ${body}`);
      return;
    }

    try {
      const notification = new Notification({
        title,
        body,
        icon: icon || this.getDefaultIcon(),
        silent: false,
        urgency: this.getUrgency(type),
      });

      notification.on('click', () => {
        // 点击通知时的处理逻辑
        console.log('Notification clicked:', title);
      });

      notification.on('close', () => {
        console.log('Notification closed:', title);
      });

      notification.show();
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * 获取通知紧急程度
   */
  private getUrgency(type: string): 'normal' | 'critical' | 'low' {
    switch (type) {
      case 'error':
        return 'critical';
      case 'warning':
        return 'normal';
      case 'success':
      case 'info':
      default:
        return 'low';
    }
  }

  /**
   * 获取默认图标
   */
  private getDefaultIcon(): nativeImage {
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    return nativeImage.createFromPath(iconPath);
  }

  /**
   * 根据类型获取图标
   */
  private getIcon(type: string): nativeImage {
    const iconMap: Record<string, string> = {
      learning: 'learning.png',
      break: 'break.png',
      achievement: 'achievement.png',
      report: 'report.png',
      goal: 'goal.png',
      error: 'error.png',
      success: 'success.png',
      warning: 'warning.png',
      info: 'info.png',
    };

    const iconFile = iconMap[type] || 'icon.png';
    const iconPath = path.join(__dirname, '../../assets/icons', iconFile);
    
    try {
      return nativeImage.createFromPath(iconPath);
    } catch (error) {
      console.warn(`Failed to load icon ${iconFile}, using default`);
      return this.getDefaultIcon();
    }
  }

  /**
   * 批量显示通知
   */
  showBulkNotifications(notifications: Array<{
    title: string;
    body: string;
    type?: 'success' | 'error' | 'info' | 'warning';
  }>): void {
    notifications.forEach((notification, index) => {
      // 延迟显示，避免通知堆叠
      setTimeout(() => {
        this.showNotification(
          notification.title,
          notification.body,
          notification.type || 'info'
        );
      }, index * 1000);
    });
  }

  /**
   * 显示定时提醒
   */
  scheduleReminder(
    title: string,
    body: string,
    delayMinutes: number,
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ): NodeJS.Timeout {
    return setTimeout(() => {
      this.showNotification(title, body, type);
    }, delayMinutes * 60 * 1000);
  }

  /**
   * 清除定时提醒
   */
  clearReminder(timerId: NodeJS.Timeout): void {
    clearTimeout(timerId);
  }

  /**
   * 显示系统状态通知
   */
  showSystemStatus(status: {
    isOnline: boolean;
    isMonitoring: boolean;
    nextScreenshot?: Date;
  }): void {
    let message = '';
    let type: 'success' | 'error' | 'info' | 'warning' = 'info';

    if (!status.isOnline) {
      message = '离线状态 - 无法连接到服务器';
      type = 'error';
    } else if (!status.isMonitoring) {
      message = '在线状态 - 监控已停止';
      type = 'warning';
    } else {
      const nextTime = status.nextScreenshot 
        ? status.nextScreenshot.toLocaleTimeString()
        : '未知';
      message = `在线监控中 - 下次截图：${nextTime}`;
      type = 'success';
    }

    this.showNotification('系统状态', message, type);
  }
}
