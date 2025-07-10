import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import Store from 'electron-store';
import * as path from 'path';
import { ScreenshotService } from './services/ScreenshotService';
import { APIService } from './services/APIService';
import { NotificationService } from './services/NotificationService';

// 配置存储
const store = new Store({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    settings: {
      screenshotInterval: 15, // 分钟
      autoStart: true,
      minimizeToTray: true,
      notifications: true,
    },
    auth: {
      token: null,
      user: null,
    },
  },
});

class LearningSuperviserApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private screenshotService: ScreenshotService;
  private apiService: APIService;
  private notificationService: NotificationService;
  private isQuitting = false;

  constructor() {
    this.screenshotService = new ScreenshotService();
    this.apiService = new APIService();
    this.notificationService = new NotificationService();
    
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    // 确保只有一个实例运行
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
      return;
    }

    // 设置应用事件监听器
    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });

    app.on('ready', this.onAppReady.bind(this));
    app.on('window-all-closed', this.onWindowAllClosed.bind(this));
    app.on('activate', this.onActivate.bind(this));
    app.on('before-quit', () => {
      this.isQuitting = true;
    });

    // 设置IPC监听器
    this.setupIpcHandlers();
  }

  private async onAppReady(): Promise<void> {
    // 创建主窗口
    this.createMainWindow();
    
    // 创建系统托盘
    this.createTray();
    
    // 设置菜单
    this.createMenu();
    
    // 初始化服务
    await this.initializeServices();
    
    // 检查更新
    this.checkForUpdates();
  }

  private createMainWindow(): void {
    const bounds = store.get('windowBounds') as any;
    
    this.mainWindow = new BrowserWindow({
      ...bounds,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      icon: this.getAppIcon(),
      show: false,
    });

    // 加载应用
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    // 窗口事件
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('close', (event) => {
      const settings = store.get('settings') as any;
      if (!this.isQuitting && settings.minimizeToTray) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 保存窗口大小和位置
    this.mainWindow.on('resize', () => {
      if (this.mainWindow) {
        store.set('windowBounds', this.mainWindow.getBounds());
      }
    });

    this.mainWindow.on('move', () => {
      if (this.mainWindow) {
        store.set('windowBounds', this.mainWindow.getBounds());
      }
    });
  }

  private createTray(): void {
    const icon = this.getAppIcon();
    this.tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          this.mainWindow?.show();
        },
      },
      {
        label: '开始监控',
        click: () => {
          this.screenshotService.start();
        },
      },
      {
        label: '停止监控',
        click: () => {
          this.screenshotService.stop();
        },
      },
      { type: 'separator' },
      {
        label: '设置',
        click: () => {
          this.mainWindow?.show();
          this.mainWindow?.webContents.send('navigate-to', '/settings');
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('Learning Supervisor');
    
    this.tray.on('double-click', () => {
      this.mainWindow?.show();
    });
  }

  private createMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '文件',
        submenu: [
          {
            label: '设置',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.mainWindow?.webContents.send('navigate-to', '/settings');
            },
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.isQuitting = true;
              app.quit();
            },
          },
        ],
      },
      {
        label: '监控',
        submenu: [
          {
            label: '开始监控',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              this.screenshotService.start();
            },
          },
          {
            label: '停止监控',
            accelerator: 'CmdOrCtrl+T',
            click: () => {
              this.screenshotService.stop();
            },
          },
          { type: 'separator' },
          {
            label: '立即截图',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => {
              this.screenshotService.takeScreenshot();
            },
          },
        ],
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于',
            click: () => {
              dialog.showMessageBox(this.mainWindow!, {
                type: 'info',
                title: '关于 Learning Supervisor',
                message: 'Learning Supervisor v1.0.0',
                detail: 'AI驱动的学习监督系统\n帮助您更好地管理和分析学习时间',
              });
            },
          },
          {
            label: '检查更新',
            click: () => {
              autoUpdater.checkForUpdatesAndNotify();
            },
          },
          { type: 'separator' },
          {
            label: '访问官网',
            click: () => {
              shell.openExternal('https://github.com/your-username/learning-supervisor');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private async initializeServices(): Promise<void> {
    // 初始化API服务
    const authData = store.get('auth') as any;
    if (authData.token) {
      this.apiService.setAuthToken(authData.token);
    }

    // 初始化截图服务
    const settings = store.get('settings') as any;
    this.screenshotService.setInterval(settings.screenshotInterval);
    
    // 设置服务事件监听器
    this.screenshotService.on('screenshot-taken', async (screenshotPath: string) => {
      try {
        await this.apiService.uploadScreenshot(screenshotPath);
        this.mainWindow?.webContents.send('screenshot-uploaded', screenshotPath);
      } catch (error) {
        console.error('Failed to upload screenshot:', error);
        this.notificationService.showError('截图上传失败', error.message);
      }
    });

    this.screenshotService.on('error', (error: Error) => {
      console.error('Screenshot service error:', error);
      this.notificationService.showError('截图服务错误', error.message);
    });

    // 如果设置了自动开始，则启动监控
    if (settings.autoStart && authData.token) {
      this.screenshotService.start();
    }
  }

  private setupIpcHandlers(): void {
    // 认证相关
    ipcMain.handle('auth:login', async (_, credentials) => {
      try {
        const result = await this.apiService.login(credentials);
        if (result.success) {
          store.set('auth', result.data);
          this.apiService.setAuthToken(result.data.token);
        }
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:logout', async () => {
      try {
        await this.apiService.logout();
        store.delete('auth');
        this.screenshotService.stop();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 设置相关
    ipcMain.handle('settings:get', () => {
      return store.get('settings');
    });

    ipcMain.handle('settings:set', (_, settings) => {
      store.set('settings', settings);
      this.screenshotService.setInterval(settings.screenshotInterval);
      return { success: true };
    });

    // 监控控制
    ipcMain.handle('monitoring:start', () => {
      this.screenshotService.start();
      return { success: true };
    });

    ipcMain.handle('monitoring:stop', () => {
      this.screenshotService.stop();
      return { success: true };
    });

    ipcMain.handle('monitoring:status', () => {
      return {
        isRunning: this.screenshotService.isRunning(),
        nextScreenshot: this.screenshotService.getNextScreenshotTime(),
      };
    });

    // 数据获取
    ipcMain.handle('api:get', async (_, endpoint) => {
      return await this.apiService.get(endpoint);
    });

    ipcMain.handle('api:post', async (_, endpoint, data) => {
      return await this.apiService.post(endpoint, data);
    });
  }

  private getAppIcon(): nativeImage {
    const iconPath = process.platform === 'darwin' 
      ? path.join(__dirname, '../assets/icon.icns')
      : path.join(__dirname, '../assets/icon.png');
    
    return nativeImage.createFromPath(iconPath);
  }

  private checkForUpdates(): void {
    if (process.env.NODE_ENV === 'production') {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }

  private onWindowAllClosed(): void {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  private onActivate(): void {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createMainWindow();
    }
  }
}

// 启动应用
new LearningSuperviserApp();
