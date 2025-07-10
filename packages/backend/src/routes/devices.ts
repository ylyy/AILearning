import { Router } from 'express';
import { supabase } from '../index';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 获取设备列表
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  try {
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', req.user.id)
      .order('last_active', { ascending: false });

    if (error) {
      logger.error('Failed to fetch devices:', error);
      throw createError('Failed to fetch devices', 500);
    }

    res.json({
      success: true,
      data: devices || [],
    });

  } catch (error) {
    logger.error('Error fetching devices:', error);
    throw error;
  }
}));

/**
 * 注册新设备
 */
router.post('/register', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { device_name, device_type, platform } = req.body;

  if (!device_name || !device_type || !platform) {
    throw createError('Missing required fields: device_name, device_type, platform', 400);
  }

  // 验证设备类型和平台
  const validDeviceTypes = ['desktop', 'mobile'];
  const validPlatforms = ['windows', 'mac', 'ios', 'android'];

  if (!validDeviceTypes.includes(device_type)) {
    throw createError('Invalid device_type. Must be: desktop, mobile', 400);
  }

  if (!validPlatforms.includes(platform)) {
    throw createError('Invalid platform. Must be: windows, mac, ios, android', 400);
  }

  try {
    // 检查设备名称是否已存在
    const { data: existingDevice, error: checkError } = await supabase
      .from('devices')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('device_name', device_name)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('Failed to check existing device:', checkError);
      throw createError('Failed to check existing device', 500);
    }

    if (existingDevice) {
      throw createError('Device name already exists', 409);
    }

    // 创建新设备
    const { data: device, error } = await supabase
      .from('devices')
      .insert({
        user_id: req.user.id,
        device_name,
        device_type,
        platform,
        last_active: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to register device:', error);
      throw createError('Failed to register device', 500);
    }

    logger.info(`Device registered: ${device.id}`, {
      userId: req.user.id,
      deviceName: device_name,
      deviceType: device_type,
      platform,
    });

    res.json({
      success: true,
      data: device,
      message: 'Device registered successfully',
    });

  } catch (error) {
    logger.error('Error registering device:', error);
    throw error;
  }
}));

/**
 * 更新设备信息
 */
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;
  const { device_name } = req.body;

  if (!device_name) {
    throw createError('Missing required field: device_name', 400);
  }

  try {
    // 验证设备存在且属于当前用户
    const { data: existingDevice, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !existingDevice) {
      throw createError('Device not found', 404);
    }

    // 检查新设备名称是否与其他设备冲突
    const { data: conflictDevice, error: checkError } = await supabase
      .from('devices')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('device_name', device_name)
      .neq('id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('Failed to check device name conflict:', checkError);
      throw createError('Failed to check device name conflict', 500);
    }

    if (conflictDevice) {
      throw createError('Device name already exists', 409);
    }

    // 更新设备信息
    const { data: updatedDevice, error: updateError } = await supabase
      .from('devices')
      .update({
        device_name,
        last_active: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update device:', updateError);
      throw createError('Failed to update device', 500);
    }

    logger.info(`Device updated: ${id}`, {
      userId: req.user.id,
      newDeviceName: device_name,
    });

    res.json({
      success: true,
      data: updatedDevice,
      message: 'Device updated successfully',
    });

  } catch (error) {
    logger.error('Error updating device:', error);
    throw error;
  }
}));

/**
 * 更新设备活跃时间
 */
router.put('/:id/heartbeat', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  try {
    // 验证设备存在且属于当前用户
    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !device) {
      throw createError('Device not found', 404);
    }

    // 更新最后活跃时间
    const { error: updateError } = await supabase
      .from('devices')
      .update({ last_active: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      logger.error('Failed to update device heartbeat:', updateError);
      throw createError('Failed to update device heartbeat', 500);
    }

    res.json({
      success: true,
      message: 'Device heartbeat updated',
    });

  } catch (error) {
    logger.error('Error updating device heartbeat:', error);
    throw error;
  }
}));

/**
 * 删除设备
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  try {
    // 验证设备存在且属于当前用户
    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !device) {
      throw createError('Device not found', 404);
    }

    // 检查是否有关联的截图
    const { count: screenshotCount, error: countError } = await supabase
      .from('screenshots')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', id);

    if (countError) {
      logger.error('Failed to count device screenshots:', countError);
      throw createError('Failed to check device usage', 500);
    }

    if (screenshotCount && screenshotCount > 0) {
      throw createError(
        `Cannot delete device with ${screenshotCount} associated screenshots. Please delete screenshots first.`,
        409
      );
    }

    // 删除设备
    const { error: deleteError } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Failed to delete device:', deleteError);
      throw createError('Failed to delete device', 500);
    }

    logger.info(`Device deleted: ${id}`, {
      userId: req.user.id,
      deviceName: device.device_name,
    });

    res.json({
      success: true,
      message: 'Device deleted successfully',
    });

  } catch (error) {
    logger.error('Error deleting device:', error);
    throw error;
  }
}));

/**
 * 获取设备统计信息
 */
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;
  const { days = '7' } = req.query;

  try {
    // 验证设备存在且属于当前用户
    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !device) {
      throw createError('Device not found', 404);
    }

    // 计算日期范围
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days as string));

    // 获取设备的截图统计
    const { data: screenshots, error: screenshotError } = await supabase
      .from('screenshots')
      .select(`
        *,
        activity_analysis(*)
      `)
      .eq('device_id', id)
      .gte('captured_at', startDate.toISOString())
      .lte('captured_at', endDate.toISOString());

    if (screenshotError) {
      logger.error('Failed to fetch device screenshots:', screenshotError);
      throw createError('Failed to fetch device statistics', 500);
    }

    // 计算统计数据
    const stats = {
      device_info: device,
      period_days: parseInt(days as string),
      total_screenshots: screenshots?.length || 0,
      total_time_minutes: (screenshots?.length || 0) * 15,
      activity_breakdown: {} as Record<string, number>,
      daily_activity: {} as Record<string, number>,
      learning_time_minutes: 0,
      average_productivity: 0,
    };

    if (screenshots && screenshots.length > 0) {
      // 活动类型分布
      const analyses = screenshots
        .filter(s => s.activity_analysis && s.activity_analysis.length > 0)
        .map(s => s.activity_analysis[0]);

      analyses.forEach(analysis => {
        if (analysis) {
          stats.activity_breakdown[analysis.activity_type] = 
            (stats.activity_breakdown[analysis.activity_type] || 0) + 1;

          if (analysis.activity_type === 'learning') {
            stats.learning_time_minutes += 15;
          }
        }
      });

      // 平均生产力
      if (analyses.length > 0) {
        stats.average_productivity = 
          Math.round(analyses.reduce((sum, a) => sum + (a?.productivity_score || 0), 0) / analyses.length * 10) / 10;
      }

      // 每日活动分布
      screenshots.forEach(screenshot => {
        const date = screenshot.captured_at.split('T')[0];
        stats.daily_activity[date] = (stats.daily_activity[date] || 0) + 1;
      });
    }

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Error fetching device stats:', error);
    throw error;
  }
}));

export { router as deviceRoutes };
