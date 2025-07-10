import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../index';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { pathUtils, dateUtils } from '@learning-supervisor/shared';

const router = Router();

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * 上传截图
 */
router.post('/upload', upload.single('screenshot'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  if (!req.file) {
    throw createError('No screenshot file provided', 400);
  }

  const { device_id, captured_at } = req.body;

  if (!device_id || !captured_at) {
    throw createError('Missing required fields: device_id, captured_at', 400);
  }

  try {
    // 验证设备属于当前用户
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .eq('user_id', req.user.id)
      .single();

    if (deviceError || !device) {
      throw createError('Device not found or not owned by user', 404);
    }

    // 生成文件路径
    const capturedDate = new Date(captured_at);
    const filePath = pathUtils.generateScreenshotPath(req.user.id, device_id, capturedDate);

    // 上传到Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Failed to upload screenshot to storage:', uploadError);
      throw createError('Failed to upload screenshot', 500);
    }

    // 创建截图记录
    const { data: screenshot, error: dbError } = await supabase
      .from('screenshots')
      .insert({
        user_id: req.user.id,
        device_id,
        file_path: uploadData.path,
        captured_at,
        analysis_status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Failed to create screenshot record:', dbError);
      
      // 清理已上传的文件
      await supabase.storage
        .from('screenshots')
        .remove([uploadData.path]);
      
      throw createError('Failed to create screenshot record', 500);
    }

    // 更新设备最后活跃时间
    await supabase
      .from('devices')
      .update({ last_active: new Date().toISOString() })
      .eq('id', device_id);

    logger.info(`Screenshot uploaded successfully: ${screenshot.id}`, {
      userId: req.user.id,
      deviceId: device_id,
      filePath: uploadData.path,
    });

    res.json({
      success: true,
      data: screenshot,
      message: 'Screenshot uploaded successfully',
    });

  } catch (error) {
    logger.error('Screenshot upload error:', error);
    throw error;
  }
}));

/**
 * 获取截图列表
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { 
    page = '1', 
    limit = '20', 
    device_id, 
    start_date, 
    end_date,
    analysis_status 
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase
      .from('screenshots')
      .select(`
        *,
        devices(device_name, device_type, platform),
        activity_analysis(*)
      `)
      .eq('user_id', req.user.id)
      .order('captured_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // 添加过滤条件
    if (device_id) {
      query = query.eq('device_id', device_id);
    }

    if (start_date) {
      query = query.gte('captured_at', start_date);
    }

    if (end_date) {
      query = query.lte('captured_at', end_date);
    }

    if (analysis_status) {
      query = query.eq('analysis_status', analysis_status);
    }

    const { data: screenshots, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch screenshots:', error);
      throw createError('Failed to fetch screenshots', 500);
    }

    // 为每个截图生成公共URL
    const screenshotsWithUrls = screenshots?.map(screenshot => ({
      ...screenshot,
      public_url: supabase.storage
        .from('screenshots')
        .getPublicUrl(screenshot.file_path).data.publicUrl,
    })) || [];

    res.json({
      success: true,
      data: {
        screenshots: screenshotsWithUrls,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum),
        },
      },
    });

  } catch (error) {
    logger.error('Error fetching screenshots:', error);
    throw error;
  }
}));

/**
 * 获取单个截图详情
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  try {
    const { data: screenshot, error } = await supabase
      .from('screenshots')
      .select(`
        *,
        devices(device_name, device_type, platform),
        activity_analysis(*)
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !screenshot) {
      throw createError('Screenshot not found', 404);
    }

    // 生成公共URL
    const screenshotWithUrl = {
      ...screenshot,
      public_url: supabase.storage
        .from('screenshots')
        .getPublicUrl(screenshot.file_path).data.publicUrl,
    };

    res.json({
      success: true,
      data: screenshotWithUrl,
    });

  } catch (error) {
    logger.error('Error fetching screenshot:', error);
    throw error;
  }
}));

/**
 * 删除截图
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  try {
    // 获取截图信息
    const { data: screenshot, error: fetchError } = await supabase
      .from('screenshots')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !screenshot) {
      throw createError('Screenshot not found', 404);
    }

    // 删除存储中的文件
    const { error: storageError } = await supabase.storage
      .from('screenshots')
      .remove([screenshot.file_path]);

    if (storageError) {
      logger.warn('Failed to delete screenshot from storage:', storageError);
    }

    // 删除数据库记录（会级联删除相关的分析记录）
    const { error: deleteError } = await supabase
      .from('screenshots')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Failed to delete screenshot record:', deleteError);
      throw createError('Failed to delete screenshot', 500);
    }

    logger.info(`Screenshot deleted: ${id}`, {
      userId: req.user.id,
      filePath: screenshot.file_path,
    });

    res.json({
      success: true,
      message: 'Screenshot deleted successfully',
    });

  } catch (error) {
    logger.error('Error deleting screenshot:', error);
    throw error;
  }
}));

/**
 * 重新分析截图
 */
router.post('/:id/reanalyze', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  try {
    // 验证截图存在且属于当前用户
    const { data: screenshot, error } = await supabase
      .from('screenshots')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !screenshot) {
      throw createError('Screenshot not found', 404);
    }

    // 重置分析状态
    await supabase
      .from('screenshots')
      .update({ analysis_status: 'pending' })
      .eq('id', id);

    // 删除现有的分析结果
    await supabase
      .from('activity_analysis')
      .delete()
      .eq('screenshot_id', id);

    logger.info(`Screenshot queued for reanalysis: ${id}`, {
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Screenshot queued for reanalysis',
    });

  } catch (error) {
    logger.error('Error reanalyzing screenshot:', error);
    throw error;
  }
}));

export { router as screenshotRoutes };
