import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { screenshotRoutes } from './routes/screenshots';
import { analysisRoutes } from './routes/analysis';
import { statsRoutes } from './routes/stats';
import { notificationRoutes } from './routes/notifications';
import { deviceRoutes } from './routes/devices';
import { AnalysisService } from './services/AnalysisService';
import { NotificationService } from './services/NotificationService';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Supabase客户端初始化
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Missing required Supabase environment variables');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 初始化服务
const analysisService = new AnalysisService(supabase);
const notificationService = new NotificationService(supabase);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API路由
app.use('/api/screenshots', authMiddleware, screenshotRoutes);
app.use('/api/analysis', authMiddleware, analysisRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/devices', authMiddleware, deviceRoutes);

// 错误处理中间件
app.use(errorHandler);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`Learning Supervisor Backend Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 启动后台服务
  analysisService.startBackgroundProcessing();
  notificationService.startScheduledNotifications();
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  analysisService.stopBackgroundProcessing();
  notificationService.stopScheduledNotifications();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  analysisService.stopBackgroundProcessing();
  notificationService.stopScheduledNotifications();
  process.exit(0);
});

export default app;
