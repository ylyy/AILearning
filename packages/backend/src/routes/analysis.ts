import { Router } from 'express';
import { supabase } from '../index';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 获取活动分析列表
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { 
    page = '1', 
    limit = '50', 
    activity_type,
    start_date, 
    end_date,
    learning_subject
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase
      .from('activity_analysis')
      .select(`
        *,
        screenshots!inner(user_id, captured_at, file_path, devices(device_name))
      `)
      .eq('screenshots.user_id', req.user.id)
      .order('analysis_time', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // 添加过滤条件
    if (activity_type) {
      query = query.eq('activity_type', activity_type);
    }

    if (start_date) {
      query = query.gte('screenshots.captured_at', start_date);
    }

    if (end_date) {
      query = query.lte('screenshots.captured_at', end_date);
    }

    if (learning_subject) {
      query = query.eq('learning_subject', learning_subject);
    }

    const { data: analyses, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch activity analyses:', error);
      throw createError('Failed to fetch activity analyses', 500);
    }

    res.json({
      success: true,
      data: {
        analyses: analyses || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum),
        },
      },
    });

  } catch (error) {
    logger.error('Error fetching activity analyses:', error);
    throw error;
  }
}));

/**
 * 获取活动分析统计
 */
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { start_date, end_date, group_by = 'day' } = req.query;

  try {
    let query = supabase
      .from('activity_analysis')
      .select(`
        *,
        screenshots!inner(user_id, captured_at)
      `)
      .eq('screenshots.user_id', req.user.id);

    if (start_date) {
      query = query.gte('screenshots.captured_at', start_date);
    }

    if (end_date) {
      query = query.lte('screenshots.captured_at', end_date);
    }

    const { data: analyses, error } = await query;

    if (error) {
      logger.error('Failed to fetch analysis stats:', error);
      throw createError('Failed to fetch analysis stats', 500);
    }

    // 统计数据
    const stats = {
      total_analyses: analyses?.length || 0,
      activity_breakdown: {} as Record<string, number>,
      learning_time_minutes: 0,
      average_productivity: 0,
      top_learning_subjects: {} as Record<string, number>,
      daily_stats: {} as Record<string, any>,
    };

    if (analyses && analyses.length > 0) {
      // 活动类型分布
      analyses.forEach(analysis => {
        stats.activity_breakdown[analysis.activity_type] = 
          (stats.activity_breakdown[analysis.activity_type] || 0) + 1;
      });

      // 学习时间（每个分析代表15分钟）
      const learningAnalyses = analyses.filter(a => a.activity_type === 'learning');
      stats.learning_time_minutes = learningAnalyses.length * 15;

      // 平均生产力
      stats.average_productivity = analyses.reduce((sum, a) => sum + a.productivity_score, 0) / analyses.length;

      // 热门学习科目
      learningAnalyses.forEach(analysis => {
        if (analysis.learning_subject) {
          stats.top_learning_subjects[analysis.learning_subject] = 
            (stats.top_learning_subjects[analysis.learning_subject] || 0) + 1;
        }
      });

      // 按日期分组统计
      if (group_by === 'day') {
        analyses.forEach(analysis => {
          const date = analysis.screenshots.captured_at.split('T')[0];
          if (!stats.daily_stats[date]) {
            stats.daily_stats[date] = {
              total: 0,
              learning: 0,
              productivity_sum: 0,
              activity_breakdown: {},
            };
          }
          
          stats.daily_stats[date].total += 1;
          stats.daily_stats[date].productivity_sum += analysis.productivity_score;
          
          if (analysis.activity_type === 'learning') {
            stats.daily_stats[date].learning += 1;
          }
          
          stats.daily_stats[date].activity_breakdown[analysis.activity_type] = 
            (stats.daily_stats[date].activity_breakdown[analysis.activity_type] || 0) + 1;
        });

        // 计算每日平均生产力
        Object.keys(stats.daily_stats).forEach(date => {
          const dayStats = stats.daily_stats[date];
          dayStats.average_productivity = dayStats.productivity_sum / dayStats.total;
          dayStats.learning_time_minutes = dayStats.learning * 15;
          delete dayStats.productivity_sum; // 移除临时字段
        });
      }
    }

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Error fetching analysis stats:', error);
    throw error;
  }
}));

/**
 * 获取学习科目列表
 */
router.get('/subjects', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  try {
    const { data: analyses, error } = await supabase
      .from('activity_analysis')
      .select(`
        learning_subject,
        screenshots!inner(user_id)
      `)
      .eq('screenshots.user_id', req.user.id)
      .eq('activity_type', 'learning')
      .not('learning_subject', 'is', null);

    if (error) {
      logger.error('Failed to fetch learning subjects:', error);
      throw createError('Failed to fetch learning subjects', 500);
    }

    // 统计每个科目的出现次数
    const subjectCounts: Record<string, number> = {};
    analyses?.forEach(analysis => {
      if (analysis.learning_subject) {
        subjectCounts[analysis.learning_subject] = 
          (subjectCounts[analysis.learning_subject] || 0) + 1;
      }
    });

    // 转换为数组并按出现次数排序
    const subjects = Object.entries(subjectCounts)
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: subjects,
    });

  } catch (error) {
    logger.error('Error fetching learning subjects:', error);
    throw error;
  }
}));

/**
 * 更新分析结果
 */
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;
  const { 
    activity_type, 
    description, 
    tags, 
    learning_subject, 
    productivity_score 
  } = req.body;

  try {
    // 验证分析记录存在且属于当前用户
    const { data: existingAnalysis, error: fetchError } = await supabase
      .from('activity_analysis')
      .select(`
        *,
        screenshots!inner(user_id)
      `)
      .eq('id', id)
      .eq('screenshots.user_id', req.user.id)
      .single();

    if (fetchError || !existingAnalysis) {
      throw createError('Analysis not found', 404);
    }

    // 更新分析结果
    const updates: any = {};
    if (activity_type) updates.activity_type = activity_type;
    if (description) updates.description = description;
    if (tags) updates.tags = tags;
    if (learning_subject !== undefined) updates.learning_subject = learning_subject;
    if (productivity_score) updates.productivity_score = productivity_score;

    const { data: updatedAnalysis, error: updateError } = await supabase
      .from('activity_analysis')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update analysis:', updateError);
      throw createError('Failed to update analysis', 500);
    }

    logger.info(`Analysis updated: ${id}`, {
      userId: req.user.id,
      updates,
    });

    res.json({
      success: true,
      data: updatedAnalysis,
      message: 'Analysis updated successfully',
    });

  } catch (error) {
    logger.error('Error updating analysis:', error);
    throw error;
  }
}));

/**
 * 删除分析结果
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { id } = req.params;

  try {
    // 验证分析记录存在且属于当前用户
    const { data: existingAnalysis, error: fetchError } = await supabase
      .from('activity_analysis')
      .select(`
        *,
        screenshots!inner(user_id)
      `)
      .eq('id', id)
      .eq('screenshots.user_id', req.user.id)
      .single();

    if (fetchError || !existingAnalysis) {
      throw createError('Analysis not found', 404);
    }

    // 删除分析记录
    const { error: deleteError } = await supabase
      .from('activity_analysis')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Failed to delete analysis:', deleteError);
      throw createError('Failed to delete analysis', 500);
    }

    logger.info(`Analysis deleted: ${id}`, {
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Analysis deleted successfully',
    });

  } catch (error) {
    logger.error('Error deleting analysis:', error);
    throw error;
  }
}));

export { router as analysisRoutes };
