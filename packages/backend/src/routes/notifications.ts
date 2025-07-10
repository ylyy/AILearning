import { Router } from 'express';
import { supabase } from '../index';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 获取通知列表
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { 
    page = '1', 
    limit = '20', 
    unread_only = 'false',
    type 
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // 添加过滤条件
    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch notifications:', error);
      throw createError('Failed to fetch notifications', 500);
    }

    res.json({
      success: true,
      data: {
        notifications: notifications || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum),
        },
      },
    });

  } catch (error) {
    logger.error('Error fetching notifications:', error);
    throw error;
  }
}));

/**
 * 获取未读通知数量
 */
router.get('/unread-count', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) {
      logger.error('Failed to fetch unread count:', error);
      throw createError('Failed to fetch unread count', 500);
    }

    res.json({
      success: true,
      data: { unread_count: count || 0 },
    });

  } catch (error) {
    logger.error('Error fetching unread count:', error);
    throw error;
  }
}));

/**
 * 标记通知为已读
 */
router.put('/:id/read', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  try {
    // 验证通知存在且属于当前用户
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !notification) {
      throw createError('Notification not found', 404);
    }

    // 标记为已读
    const { data: updatedNotification, error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to mark notification as read:', updateError);
      throw createError('Failed to mark notification as read', 500);
    }

    logger.info(`Notification marked as read: ${id}`, {
      userId: req.user.id,
    });

    res.json({
      success: true,
      data: updatedNotification,
      message: 'Notification marked as read',
    });

  } catch (error) {
    logger.error('Error marking notification as read:', error);
    throw error;
  }
}));

/**
 * 标记所有通知为已读
 */
router.put('/read-all', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) {
      logger.error('Failed to mark all notifications as read:', error);
      throw createError('Failed to mark all notifications as read', 500);
    }

    logger.info(`All notifications marked as read for user: ${req.user.id}`);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });

  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    throw error;
  }
}));

/**
 * 创建通知
 */
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { type, title, message, scheduled_for } = req.body;

  if (!type || !title || !message) {
    throw createError('Missing required fields: type, title, message', 400);
  }

  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: req.user.id,
        type,
        title,
        message,
        scheduled_for,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create notification:', error);
      throw createError('Failed to create notification', 500);
    }

    logger.info(`Notification created: ${notification.id}`, {
      userId: req.user.id,
      type,
      title,
    });

    res.json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
    });

  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
}));

/**
 * 删除通知
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  try {
    // 验证通知存在且属于当前用户
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !notification) {
      throw createError('Notification not found', 404);
    }

    // 删除通知
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Failed to delete notification:', deleteError);
      throw createError('Failed to delete notification', 500);
    }

    logger.info(`Notification deleted: ${id}`, {
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });

  } catch (error) {
    logger.error('Error deleting notification:', error);
    throw error;
  }
}));

/**
 * 批量删除通知
 */
router.delete('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { notification_ids } = req.body;

  if (!notification_ids || !Array.isArray(notification_ids)) {
    throw createError('Missing or invalid notification_ids array', 400);
  }

  try {
    // 验证所有通知都属于当前用户
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', req.user.id)
      .in('id', notification_ids);

    if (fetchError) {
      logger.error('Failed to verify notifications:', fetchError);
      throw createError('Failed to verify notifications', 500);
    }

    const validIds = notifications?.map(n => n.id) || [];
    const invalidIds = notification_ids.filter(id => !validIds.includes(id));

    if (invalidIds.length > 0) {
      throw createError(`Invalid notification IDs: ${invalidIds.join(', ')}`, 400);
    }

    // 批量删除
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .in('id', validIds);

    if (deleteError) {
      logger.error('Failed to delete notifications:', deleteError);
      throw createError('Failed to delete notifications', 500);
    }

    logger.info(`Batch deleted ${validIds.length} notifications`, {
      userId: req.user.id,
      deletedIds: validIds,
    });

    res.json({
      success: true,
      message: `${validIds.length} notifications deleted successfully`,
    });

  } catch (error) {
    logger.error('Error batch deleting notifications:', error);
    throw error;
  }
}));

/**
 * 获取通知设置
 */
router.get('/settings', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('notifications_enabled')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to fetch notification settings:', error);
      throw createError('Failed to fetch notification settings', 500);
    }

    res.json({
      success: true,
      data: {
        notifications_enabled: settings?.notifications_enabled ?? true,
      },
    });

  } catch (error) {
    logger.error('Error fetching notification settings:', error);
    throw error;
  }
}));

/**
 * 更新通知设置
 */
router.put('/settings', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { notifications_enabled } = req.body;

  if (typeof notifications_enabled !== 'boolean') {
    throw createError('notifications_enabled must be a boolean', 400);
  }

  try {
    const { data: updatedSettings, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: req.user.id,
        notifications_enabled,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to update notification settings:', error);
      throw createError('Failed to update notification settings', 500);
    }

    logger.info(`Notification settings updated for user: ${req.user.id}`, {
      notifications_enabled,
    });

    res.json({
      success: true,
      data: updatedSettings,
      message: 'Notification settings updated successfully',
    });

  } catch (error) {
    logger.error('Error updating notification settings:', error);
    throw error;
  }
}));

export { router as notificationRoutes };
