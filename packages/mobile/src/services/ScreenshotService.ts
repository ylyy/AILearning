import { Platform, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
import BackgroundJob from 'react-native-background-job';

export class ScreenshotService {
  private isRunning: boolean = false;
  private intervalMinutes: number = 15;
  private backgroundJob: any = null;

  constructor() {
    this.setupBackgroundJob();
  }

  /**
   * 设置后台任务
   */
  private setupBackgroundJob(): void {
    this.backgroundJob = {
      jobKey: 'screenshotJob',
      period: this.intervalMinutes * 60 * 1000, // 转换为毫秒
    };
  }

  /**
   * 开始截图监控
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Screenshot service is already running');
      return;
    }

    try {
      // 检查权限
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        throw new Error('缺少必要权限');
      }

      // 启动后台任务
      BackgroundJob.start({
        jobKey: this.backgroundJob.jobKey,
        period: this.backgroundJob.period,
        requiredNetworkType: 'any',
        persistAfterReboot: true,
      });

      this.isRunning = true;
      console.log(`Screenshot service started with ${this.intervalMinutes} minute interval`);
    } catch (error) {
      console.error('Failed to start screenshot service:', error);
      throw error;
    }
  }

  /**
   * 停止截图监控
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Screenshot service is not running');
      return;
    }

    BackgroundJob.stop({
      jobKey: this.backgroundJob.jobKey,
    });

    this.isRunning = false;
    console.log('Screenshot service stopped');
  }

  /**
   * 拍摄屏幕截图
   */
  async takeScreenshot(): Promise<string | null> {
    try {
      // 在移动端，我们需要截取当前视图
      // 这里使用ViewShot来截取屏幕
      const uri = await ViewShot.captureScreen({
        format: 'png',
        quality: 0.8,
      });

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const documentsPath = RNFS.DocumentDirectoryPath;
      const screenshotPath = `${documentsPath}/screenshots`;
      
      // 确保目录存在
      await this.ensureDirectoryExists(screenshotPath);
      
      const finalPath = `${screenshotPath}/${filename}`;

      // 移动文件到目标位置
      await RNFS.moveFile(uri, finalPath);

      console.log(`Screenshot saved: ${finalPath}`);
      return finalPath;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      return null;
    }
  }

  /**
   * 检查权限
   */
  private async checkPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Android权限检查
        const { PermissionsAndroid } = require('react-native');
        
        const permissions = [
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        return Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // iOS权限检查
        return true; // iOS通常不需要额外权限来截图
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(dirPath);
      if (!exists) {
        await RNFS.mkdir(dirPath);
      }
    } catch (error) {
      console.error('Failed to create directory:', error);
    }
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo(): Promise<{
    deviceName: string;
    deviceType: string;
    platform: string;
    version: string;
  }> {
    try {
      const deviceName = await DeviceInfo.getDeviceName();
      const systemName = DeviceInfo.getSystemName();
      const systemVersion = DeviceInfo.getSystemVersion();

      return {
        deviceName,
        deviceType: 'mobile',
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        version: `${systemName} ${systemVersion}`,
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      return {
        deviceName: 'Unknown Device',
        deviceType: 'mobile',
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        version: 'Unknown',
      };
    }
  }

  /**
   * 获取截图历史
   */
  async getScreenshotHistory(limit: number = 10): Promise<string[]> {
    try {
      const documentsPath = RNFS.DocumentDirectoryPath;
      const screenshotPath = `${documentsPath}/screenshots`;
      
      const exists = await RNFS.exists(screenshotPath);
      if (!exists) {
        return [];
      }

      const files = await RNFS.readDir(screenshotPath);
      const screenshots = files
        .filter(file => file.name.endsWith('.png'))
        .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
        .slice(0, limit)
        .map(file => file.path);

      return screenshots;
    } catch (error) {
      console.error('Failed to get screenshot history:', error);
      return [];
    }
  }

  /**
   * 清理旧截图
   */
  async cleanupOldScreenshots(daysToKeep: number = 7): Promise<void> {
    try {
      const documentsPath = RNFS.DocumentDirectoryPath;
      const screenshotPath = `${documentsPath}/screenshots`;
      
      const exists = await RNFS.exists(screenshotPath);
      if (!exists) {
        return;
      }

      const files = await RNFS.readDir(screenshotPath);
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (!file.name.endsWith('.png')) continue;
        
        const fileTime = new Date(file.mtime).getTime();
        if (fileTime < cutoffTime) {
          await RNFS.unlink(file.path);
          console.log(`Deleted old screenshot: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old screenshots:', error);
    }
  }

  /**
   * 设置截图间隔
   */
  setInterval(minutes: number): void {
    if (minutes < 1 || minutes > 60) {
      throw new Error('Screenshot interval must be between 1 and 60 minutes');
    }
    
    this.intervalMinutes = minutes;
    this.backgroundJob.period = minutes * 60 * 1000;
    
    // 如果正在运行，重新启动以应用新间隔
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * 检查服务是否正在运行
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 获取下次截图时间
   */
  getNextScreenshotTime(): Date | null {
    if (!this.isRunning) {
      return null;
    }

    const now = new Date();
    const nextTime = new Date(now.getTime() + this.intervalMinutes * 60 * 1000);
    return nextTime;
  }
}
