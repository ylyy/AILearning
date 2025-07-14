import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as cron from 'node-cron';
import * as os from 'os';
import * as path from 'path';
import screenshot from 'screenshot-desktop';

export class ScreenshotService extends EventEmitter {
  private intervalMinutes: number = 15;
  private cronJob: cron.ScheduledTask | null = null;
  private screenshotDir: string;
  private thumbnailDir: string;
  private isActive: boolean = false;

  constructor() {
    super();

    // 创建截图存储目录
    this.screenshotDir = path.join(os.homedir(), '.learning-supervisor', 'screenshots');
    this.thumbnailDir = path.join(os.homedir(), '.learning-supervisor', 'thumbnails');
    this.ensureDirectoryExists(this.screenshotDir);
    this.ensureDirectoryExists(this.thumbnailDir);
  }

  /**
   * 设置截图间隔
   */
  setInterval(minutes: number): void {
    if (minutes < 1 || minutes > 60) {
      throw new Error('Screenshot interval must be between 1 and 60 minutes');
    }

    this.intervalMinutes = minutes;

    // 如果正在运行，重新启动以应用新间隔
    if (this.isActive) {
      this.stop();
      this.start();
    }
  }

  /**
   * 开始定时截图
   */
  start(): void {
    if (this.isActive) {
      console.log('Screenshot service is already running');
      return;
    }

    // 创建cron表达式：每N分钟执行一次
    const cronExpression = `*/${this.intervalMinutes} * * * *`;

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.takeScreenshot();
    }, {
      scheduled: false,
    });

    this.cronJob.start();
    this.isActive = true;

    console.log(`Screenshot service started with ${this.intervalMinutes} minute interval`);
    this.emit('started', this.intervalMinutes);

    // 立即拍摄一张截图
    setTimeout(() => this.takeScreenshot(), 1000);
  }

  /**
   * 停止定时截图
   */
  stop(): void {
    if (!this.isActive) {
      console.log('Screenshot service is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.isActive = false;
    console.log('Screenshot service stopped');
    this.emit('stopped');
  }

  /**
   * 立即拍摄截图
   */
  async takeScreenshot(): Promise<string | null> {
    try {
      console.log('Taking screenshot...');

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);

      // 拍摄截图
      const img = await screenshot({ format: 'png' });

      // 保存到文件
      await fs.promises.writeFile(filepath, img);

      // 生成缩略图
      await this.generateThumbnail(filepath);

      console.log(`Screenshot saved: ${filepath}`);
      this.emit('screenshot-taken', filepath);

      return filepath;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      this.emit('error', error);
      return null;
    }
  }

  /**
   * 获取下次截图时间
   */
  getNextScreenshotTime(): Date | null {
    if (!this.isActive || !this.cronJob) {
      return null;
    }

    // 计算下次执行时间
    const now = new Date();
    const nextMinute = Math.ceil(now.getMinutes() / this.intervalMinutes) * this.intervalMinutes;
    const nextTime = new Date(now);

    if (nextMinute >= 60) {
      nextTime.setHours(nextTime.getHours() + 1);
      nextTime.setMinutes(nextMinute - 60);
    } else {
      nextTime.setMinutes(nextMinute);
    }

    nextTime.setSeconds(0);
    nextTime.setMilliseconds(0);

    return nextTime;
  }

  /**
   * 检查服务是否正在运行
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * 获取截图历史
   */
  async getScreenshotHistory(limit: number = 10): Promise<Array<{
    filepath: string;
    filename: string;
    timestamp: Date;
    thumbnailPath: string;
    hasThumbnail: boolean;
  }>> {
    try {
      const files = await fs.promises.readdir(this.screenshotDir);
      const screenshots = [];

      for (const file of files) {
        if (!file.endsWith('.png')) continue;

        const filepath = path.join(this.screenshotDir, file);
        const stats = await fs.promises.stat(filepath);
        const thumbnailPath = this.getThumbnailPath(filepath);
        const hasThumbnail = fs.existsSync(thumbnailPath);

        // 如果没有缩略图，尝试生成一个
        if (!hasThumbnail) {
          await this.generateThumbnail(filepath);
        }

        screenshots.push({
          filepath,
          filename: file,
          timestamp: stats.mtime,
          thumbnailPath,
          hasThumbnail: fs.existsSync(thumbnailPath)
        });
      }

      // 按时间排序并限制数量
      return screenshots
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
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
      const files = await fs.promises.readdir(this.screenshotDir);
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (!file.endsWith('.png')) continue;

        const filepath = path.join(this.screenshotDir, file);
        const stats = await fs.promises.stat(filepath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.promises.unlink(filepath);
          console.log(`Deleted old screenshot: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old screenshots:', error);
    }
  }

  /**
   * 获取截图统计信息
   */
  async getStatistics(): Promise<{
    totalScreenshots: number;
    totalSize: number;
    oldestScreenshot: Date | null;
    newestScreenshot: Date | null;
  }> {
    try {
      const files = await fs.promises.readdir(this.screenshotDir);
      const screenshots = files.filter(file => file.endsWith('.png'));

      let totalSize = 0;
      let oldestTime: number | null = null;
      let newestTime: number | null = null;

      for (const file of screenshots) {
        const filepath = path.join(this.screenshotDir, file);
        const stats = await fs.promises.stat(filepath);

        totalSize += stats.size;

        if (oldestTime === null || stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime();
        }

        if (newestTime === null || stats.mtime.getTime() > newestTime) {
          newestTime = stats.mtime.getTime();
        }
      }

      return {
        totalScreenshots: screenshots.length,
        totalSize,
        oldestScreenshot: oldestTime ? new Date(oldestTime) : null,
        newestScreenshot: newestTime ? new Date(newestTime) : null,
      };
    } catch (error) {
      console.error('Failed to get screenshot statistics:', error);
      return {
        totalScreenshots: 0,
        totalSize: 0,
        oldestScreenshot: null,
        newestScreenshot: null,
      };
    }
  }

  /**
   * 生成缩略图
   */
  private async generateThumbnail(imagePath: string): Promise<string | null> {
    try {
      const sharp = require('sharp');
      const filename = path.basename(imagePath, path.extname(imagePath));
      const thumbnailPath = path.join(this.thumbnailDir, `${filename}_thumb.jpg`);

      await sharp(imagePath)
        .resize(320, 240, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      console.log(`Thumbnail generated: ${thumbnailPath}`);
      return thumbnailPath;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return null;
    }
  }

  /**
   * 获取缩略图路径
   */
  getThumbnailPath(imagePath: string): string {
    const filename = path.basename(imagePath, path.extname(imagePath));
    return path.join(this.thumbnailDir, `${filename}_thumb.jpg`);
  }

  /**
   * 确保目录存在
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 压缩截图文件
   */
  private async compressScreenshot(inputPath: string, outputPath: string, quality: number = 0.8): Promise<void> {
    // 这里可以使用sharp或其他图像处理库来压缩图片
    // 为了简化，现在只是复制文件
    await fs.promises.copyFile(inputPath, outputPath);
  }

  /**
   * 获取屏幕信息
   */
  async getScreenInfo(): Promise<{
    displays: Array<{
      id: string;
      bounds: { x: number; y: number; width: number; height: number };
      primary: boolean;
    }>;
  }> {
    try {
      // 使用screenshot-desktop获取显示器信息
      const displays = await screenshot.listDisplays();

      return {
        displays: displays.map((display, index) => ({
          id: display.id || index.toString(),
          bounds: {
            x: display.left || 0,
            y: display.top || 0,
            width: display.right ? display.right - (display.left || 0) : 1920,
            height: display.bottom ? display.bottom - (display.top || 0) : 1080,
          },
          primary: index === 0, // 假设第一个是主显示器
        }))
      };
    } catch (error) {
      console.error('Failed to get screen info:', error);
      return {
        displays: [{
          id: '0',
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
          primary: true,
        }]
      };
    }
  }

  /**
   * 截取特定显示器的截图
   */
  async takeScreenshotOfDisplay(displayId: string): Promise<string | null> {
    try {
      console.log(`Taking screenshot of display ${displayId}...`);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-display-${displayId}-${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);

      // 拍摄特定显示器的截图
      const img = await screenshot({
        format: 'png',
        screen: parseInt(displayId) || 0
      });

      await fs.promises.writeFile(filepath, img);

      console.log(`Display screenshot saved: ${filepath}`);
      this.emit('screenshot-taken', filepath);

      return filepath;
    } catch (error) {
      console.error(`Failed to take screenshot of display ${displayId}:`, error);
      this.emit('error', error);
      return null;
    }
  }
}
