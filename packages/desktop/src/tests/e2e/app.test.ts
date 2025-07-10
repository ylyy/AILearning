import { Application } from 'spectron';
import path from 'path';

describe('Desktop App E2E Tests', () => {
  let app: Application;

  beforeAll(async () => {
    app = new Application({
      path: path.join(__dirname, '../../dist/main.js'),
      args: ['--test-mode'],
      env: {
        NODE_ENV: 'test',
        ELECTRON_IS_DEV: '0',
      },
    });

    await app.start();
  }, 30000);

  afterAll(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  describe('Application Launch', () => {
    test('should launch the application', async () => {
      expect(app.isRunning()).toBe(true);
    });

    test('should show the main window', async () => {
      const windowCount = await app.client.getWindowCount();
      expect(windowCount).toBe(1);
    });

    test('should have correct window title', async () => {
      const title = await app.client.getTitle();
      expect(title).toBe('Learning Supervisor');
    });
  });

  describe('Authentication Flow', () => {
    test('should show login screen initially', async () => {
      const loginForm = await app.client.$('form[data-testid="login-form"]');
      expect(await loginForm.isDisplayed()).toBe(true);
    });

    test('should validate login form', async () => {
      // 尝试提交空表单
      const submitButton = await app.client.$('button[type="submit"]');
      await submitButton.click();

      // 检查错误消息
      const emailError = await app.client.$('[data-testid="email-error"]');
      const passwordError = await app.client.$('[data-testid="password-error"]');
      
      expect(await emailError.isDisplayed()).toBe(true);
      expect(await passwordError.isDisplayed()).toBe(true);
    });

    test('should handle invalid credentials', async () => {
      const emailInput = await app.client.$('input[type="email"]');
      const passwordInput = await app.client.$('input[type="password"]');
      const submitButton = await app.client.$('button[type="submit"]');

      await emailInput.setValue('invalid@example.com');
      await passwordInput.setValue('wrongpassword');
      await submitButton.click();

      // 等待错误消息出现
      await app.client.waitUntil(async () => {
        const errorMessage = await app.client.$('[data-testid="login-error"]');
        return await errorMessage.isDisplayed();
      }, 5000);

      const errorMessage = await app.client.$('[data-testid="login-error"]');
      expect(await errorMessage.isDisplayed()).toBe(true);
    });

    test('should login with valid credentials', async () => {
      const emailInput = await app.client.$('input[type="email"]');
      const passwordInput = await app.client.$('input[type="password"]');
      const submitButton = await app.client.$('button[type="submit"]');

      await emailInput.setValue('test@example.com');
      await passwordInput.setValue('testpassword123');
      await submitButton.click();

      // 等待导航到主界面
      await app.client.waitUntil(async () => {
        const dashboard = await app.client.$('[data-testid="dashboard"]');
        return await dashboard.isDisplayed();
      }, 10000);

      const dashboard = await app.client.$('[data-testid="dashboard"]');
      expect(await dashboard.isDisplayed()).toBe(true);
    });
  });

  describe('Main Dashboard', () => {
    test('should display dashboard components', async () => {
      const statsCard = await app.client.$('[data-testid="stats-card"]');
      const monitoringStatus = await app.client.$('[data-testid="monitoring-status"]');
      const recentActivity = await app.client.$('[data-testid="recent-activity"]');

      expect(await statsCard.isDisplayed()).toBe(true);
      expect(await monitoringStatus.isDisplayed()).toBe(true);
      expect(await recentActivity.isDisplayed()).toBe(true);
    });

    test('should show monitoring controls', async () => {
      const startButton = await app.client.$('[data-testid="start-monitoring"]');
      const stopButton = await app.client.$('[data-testid="stop-monitoring"]');

      expect(await startButton.isDisplayed()).toBe(true);
      expect(await stopButton.isDisplayed()).toBe(true);
    });
  });

  describe('Screenshot Monitoring', () => {
    test('should start monitoring', async () => {
      const startButton = await app.client.$('[data-testid="start-monitoring"]');
      await startButton.click();

      // 等待状态更新
      await app.client.waitUntil(async () => {
        const status = await app.client.$('[data-testid="monitoring-status"]');
        const statusText = await status.getText();
        return statusText.includes('运行中');
      }, 5000);

      const status = await app.client.$('[data-testid="monitoring-status"]');
      const statusText = await status.getText();
      expect(statusText).toContain('运行中');
    });

    test('should take manual screenshot', async () => {
      const screenshotButton = await app.client.$('[data-testid="take-screenshot"]');
      await screenshotButton.click();

      // 等待截图完成通知
      await app.client.waitUntil(async () => {
        const notification = await app.client.$('[data-testid="notification"]');
        return await notification.isDisplayed();
      }, 10000);

      const notification = await app.client.$('[data-testid="notification"]');
      expect(await notification.isDisplayed()).toBe(true);
    });

    test('should stop monitoring', async () => {
      const stopButton = await app.client.$('[data-testid="stop-monitoring"]');
      await stopButton.click();

      // 等待状态更新
      await app.client.waitUntil(async () => {
        const status = await app.client.$('[data-testid="monitoring-status"]');
        const statusText = await status.getText();
        return statusText.includes('已停止');
      }, 5000);

      const status = await app.client.$('[data-testid="monitoring-status"]');
      const statusText = await status.getText();
      expect(statusText).toContain('已停止');
    });
  });

  describe('Navigation', () => {
    test('should navigate to screenshots page', async () => {
      const screenshotsLink = await app.client.$('[data-testid="nav-screenshots"]');
      await screenshotsLink.click();

      await app.client.waitUntil(async () => {
        const screenshotsPage = await app.client.$('[data-testid="screenshots-page"]');
        return await screenshotsPage.isDisplayed();
      }, 5000);

      const screenshotsPage = await app.client.$('[data-testid="screenshots-page"]');
      expect(await screenshotsPage.isDisplayed()).toBe(true);
    });

    test('should navigate to analysis page', async () => {
      const analysisLink = await app.client.$('[data-testid="nav-analysis"]');
      await analysisLink.click();

      await app.client.waitUntil(async () => {
        const analysisPage = await app.client.$('[data-testid="analysis-page"]');
        return await analysisPage.isDisplayed();
      }, 5000);

      const analysisPage = await app.client.$('[data-testid="analysis-page"]');
      expect(await analysisPage.isDisplayed()).toBe(true);
    });

    test('should navigate to settings page', async () => {
      const settingsLink = await app.client.$('[data-testid="nav-settings"]');
      await settingsLink.click();

      await app.client.waitUntil(async () => {
        const settingsPage = await app.client.$('[data-testid="settings-page"]');
        return await settingsPage.isDisplayed();
      }, 5000);

      const settingsPage = await app.client.$('[data-testid="settings-page"]');
      expect(await settingsPage.isDisplayed()).toBe(true);
    });
  });

  describe('Settings', () => {
    test('should update screenshot interval', async () => {
      // 确保在设置页面
      const settingsLink = await app.client.$('[data-testid="nav-settings"]');
      await settingsLink.click();

      const intervalInput = await app.client.$('[data-testid="screenshot-interval"]');
      await intervalInput.setValue('30');

      const saveButton = await app.client.$('[data-testid="save-settings"]');
      await saveButton.click();

      // 等待保存成功通知
      await app.client.waitUntil(async () => {
        const notification = await app.client.$('[data-testid="notification"]');
        return await notification.isDisplayed();
      }, 5000);

      const notification = await app.client.$('[data-testid="notification"]');
      const notificationText = await notification.getText();
      expect(notificationText).toContain('保存成功');
    });

    test('should toggle notifications', async () => {
      const notificationToggle = await app.client.$('[data-testid="notifications-toggle"]');
      await notificationToggle.click();

      const saveButton = await app.client.$('[data-testid="save-settings"]');
      await saveButton.click();

      // 验证设置已保存
      await app.client.waitUntil(async () => {
        const notification = await app.client.$('[data-testid="notification"]');
        return await notification.isDisplayed();
      }, 5000);
    });
  });

  describe('System Tray', () => {
    test('should minimize to system tray', async () => {
      // 点击最小化按钮
      const minimizeButton = await app.client.$('[data-testid="minimize-button"]');
      await minimizeButton.click();

      // 检查窗口是否隐藏
      const isVisible = await app.client.browserWindow.isVisible();
      expect(isVisible).toBe(false);
    });

    test('should restore from system tray', async () => {
      // 模拟系统托盘双击
      await app.electron.ipcRenderer.send('tray-double-click');

      // 等待窗口显示
      await app.client.waitUntil(async () => {
        return await app.client.browserWindow.isVisible();
      }, 5000);

      const isVisible = await app.client.browserWindow.isVisible();
      expect(isVisible).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // 模拟网络断开
      await app.electron.ipcRenderer.send('simulate-network-error');

      // 检查错误通知
      await app.client.waitUntil(async () => {
        const errorNotification = await app.client.$('[data-testid="error-notification"]');
        return await errorNotification.isDisplayed();
      }, 5000);

      const errorNotification = await app.client.$('[data-testid="error-notification"]');
      expect(await errorNotification.isDisplayed()).toBe(true);
    });

    test('should recover from errors', async () => {
      // 模拟网络恢复
      await app.electron.ipcRenderer.send('simulate-network-recovery');

      // 检查恢复通知
      await app.client.waitUntil(async () => {
        const recoveryNotification = await app.client.$('[data-testid="recovery-notification"]');
        return await recoveryNotification.isDisplayed();
      }, 5000);

      const recoveryNotification = await app.client.$('[data-testid="recovery-notification"]');
      expect(await recoveryNotification.isDisplayed()).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should load pages within acceptable time', async () => {
      const startTime = Date.now();
      
      const dashboardLink = await app.client.$('[data-testid="nav-dashboard"]');
      await dashboardLink.click();

      await app.client.waitUntil(async () => {
        const dashboard = await app.client.$('[data-testid="dashboard"]');
        return await dashboard.isDisplayed();
      }, 5000);

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 应该在3秒内加载
    });

    test('should handle large datasets efficiently', async () => {
      // 导航到截图页面
      const screenshotsLink = await app.client.$('[data-testid="nav-screenshots"]');
      await screenshotsLink.click();

      // 等待页面加载
      await app.client.waitUntil(async () => {
        const screenshotsPage = await app.client.$('[data-testid="screenshots-page"]');
        return await screenshotsPage.isDisplayed();
      }, 5000);

      // 检查是否有分页或虚拟滚动
      const pagination = await app.client.$('[data-testid="pagination"]');
      const virtualList = await app.client.$('[data-testid="virtual-list"]');
      
      const hasPagination = await pagination.isDisplayed();
      const hasVirtualList = await virtualList.isDisplayed();
      
      expect(hasPagination || hasVirtualList).toBe(true);
    });
  });
});
