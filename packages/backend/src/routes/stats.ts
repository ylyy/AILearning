import { Router } from 'express';
import { supabase } from '../index';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 获取今日统计
 */
router.get('/today', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    // 获取今天的活动分析
    const { data: todayAnalyses, error } = await supabase
      .from('activity_analysis')
      .select(`
        *,
        screenshots!inner(user_id, captured_at)
      `)
      .eq('screenshots.user_id', req.user.id)
      .gte('screenshots.captured_at', todayStart)
      .lt('screenshots.captured_at', todayEnd);

    if (error) {
      logger.error('Failed to fetch today stats:', error);
      throw createError('Failed to fetch today stats', 500);
    }

    const analyses = todayAnalyses || [];
    
    // 计算统计数据
    const stats = {
      total_screenshots: analyses.length,
      total_time_minutes: analyses.length * 15,
      learning_time_minutes: analyses.filter(a => a.activity_type === 'learning').length * 15,
      average_productivity: analyses.length > 0 
        ? Math.round(analyses.reduce((sum, a) => sum + a.productivity_score, 0) / analyses.length * 10) / 10
        : 0,
      activity_breakdown: {} as Record<string, { count: number; percentage: number; time_minutes: number }>,
      learning_subjects: {} as Record<string, number>,
      hourly_distribution: {} as Record<string, number>,
    };

    // 活动类型分布
    const activityCounts: Record<string, number> = {};
    analyses.forEach(analysis => {
      activityCounts[analysis.activity_type] = (activityCounts[analysis.activity_type] || 0) + 1;
      
      // 学习科目统计
      if (analysis.activity_type === 'learning' && analysis.learning_subject) {
        stats.learning_subjects[analysis.learning_subject] = 
          (stats.learning_subjects[analysis.learning_subject] || 0) + 1;
      }

      // 小时分布
      const hour = new Date(analysis.screenshots.captured_at).getHours();
      stats.hourly_distribution[hour] = (stats.hourly_distribution[hour] || 0) + 1;
    });

    // 计算百分比
    Object.entries(activityCounts).forEach(([type, count]) => {
      stats.activity_breakdown[type] = {
        count,
        percentage: Math.round((count / analyses.length) * 100),
        time_minutes: count * 15,
      };
    });

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Error fetching today stats:', error);
    throw error;
  }
}));

/**
 * 获取本周统计
 */
router.get('/week', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // 本周开始（周日）
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // 获取本周的活动分析
    const { data: weekAnalyses, error } = await supabase
      .from('activity_analysis')
      .select(`
        *,
        screenshots!inner(user_id, captured_at)
      `)
      .eq('screenshots.user_id', req.user.id)
      .gte('screenshots.captured_at', weekStart.toISOString())
      .lt('screenshots.captured_at', weekEnd.toISOString());

    if (error) {
      logger.error('Failed to fetch week stats:', error);
      throw createError('Failed to fetch week stats', 500);
    }

    const analyses = weekAnalyses || [];
    
    // 按日期分组
    const dailyStats: Record<string, any> = {};
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    // 初始化每一天
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      dailyStats[dateStr] = {
        date: dateStr,
        day_name: weekDays[i],
        total_screenshots: 0,
        learning_time_minutes: 0,
        average_productivity: 0,
        activity_breakdown: {},
      };
    }

    // 填充数据
    analyses.forEach(analysis => {
      const date = analysis.screenshots.captured_at.split('T')[0];
      if (dailyStats[date]) {
        dailyStats[date].total_screenshots += 1;
        
        if (analysis.activity_type === 'learning') {
          dailyStats[date].learning_time_minutes += 15;
        }
        
        dailyStats[date].activity_breakdown[analysis.activity_type] = 
          (dailyStats[date].activity_breakdown[analysis.activity_type] || 0) + 1;
      }
    });

    // 计算每日平均生产力
    Object.keys(dailyStats).forEach(date => {
      const dayAnalyses = analyses.filter(a => a.screenshots.captured_at.startsWith(date));
      if (dayAnalyses.length > 0) {
        dailyStats[date].average_productivity = 
          Math.round(dayAnalyses.reduce((sum, a) => sum + a.productivity_score, 0) / dayAnalyses.length * 10) / 10;
      }
    });

    // 周总统计
    const weekStats = {
      total_screenshots: analyses.length,
      total_time_minutes: analyses.length * 15,
      learning_time_minutes: analyses.filter(a => a.activity_type === 'learning').length * 15,
      average_productivity: analyses.length > 0 
        ? Math.round(analyses.reduce((sum, a) => sum + a.productivity_score, 0) / analyses.length * 10) / 10
        : 0,
      daily_stats: Object.values(dailyStats),
      learning_streak: calculateLearningStreak(Object.values(dailyStats)),
    };

    res.json({
      success: true,
      data: weekStats,
    });

  } catch (error) {
    logger.error('Error fetching week stats:', error);
    throw error;
  }
}));

/**
 * 获取月度统计
 */
router.get('/month', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { year, month } = req.query;
  
  try {
    const targetDate = new Date();
    if (year && month) {
      targetDate.setFullYear(parseInt(year as string), parseInt(month as string) - 1, 1);
    } else {
      targetDate.setDate(1); // 当前月的第一天
    }
    
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);

    // 获取月度活动分析
    const { data: monthAnalyses, error } = await supabase
      .from('activity_analysis')
      .select(`
        *,
        screenshots!inner(user_id, captured_at)
      `)
      .eq('screenshots.user_id', req.user.id)
      .gte('screenshots.captured_at', monthStart.toISOString())
      .lt('screenshots.captured_at', monthEnd.toISOString());

    if (error) {
      logger.error('Failed to fetch month stats:', error);
      throw createError('Failed to fetch month stats', 500);
    }

    const analyses = monthAnalyses || [];
    
    // 按日期分组
    const dailyStats: Record<string, any> = {};
    
    // 初始化每一天
    const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetDate.getFullYear(), targetDate.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      
      dailyStats[dateStr] = {
        date: dateStr,
        day: day,
        total_screenshots: 0,
        learning_time_minutes: 0,
        average_productivity: 0,
      };
    }

    // 填充数据
    analyses.forEach(analysis => {
      const date = analysis.screenshots.captured_at.split('T')[0];
      if (dailyStats[date]) {
        dailyStats[date].total_screenshots += 1;
        
        if (analysis.activity_type === 'learning') {
          dailyStats[date].learning_time_minutes += 15;
        }
      }
    });

    // 计算每日平均生产力
    Object.keys(dailyStats).forEach(date => {
      const dayAnalyses = analyses.filter(a => a.screenshots.captured_at.startsWith(date));
      if (dayAnalyses.length > 0) {
        dailyStats[date].average_productivity = 
          Math.round(dayAnalyses.reduce((sum, a) => sum + a.productivity_score, 0) / dayAnalyses.length * 10) / 10;
      }
    });

    // 月总统计
    const monthStats = {
      year: targetDate.getFullYear(),
      month: targetDate.getMonth() + 1,
      total_screenshots: analyses.length,
      total_time_minutes: analyses.length * 15,
      learning_time_minutes: analyses.filter(a => a.activity_type === 'learning').length * 15,
      average_productivity: analyses.length > 0 
        ? Math.round(analyses.reduce((sum, a) => sum + a.productivity_score, 0) / analyses.length * 10) / 10
        : 0,
      daily_stats: Object.values(dailyStats),
      active_days: Object.values(dailyStats).filter((day: any) => day.total_screenshots > 0).length,
    };

    res.json({
      success: true,
      data: monthStats,
    });

  } catch (error) {
    logger.error('Error fetching month stats:', error);
    throw error;
  }
}));

/**
 * 获取学习会话统计
 */
router.get('/sessions', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw createError('User not authenticated', 401);
  }

  const { start_date, end_date, limit = '10' } = req.query;

  try {
    let query = supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('start_time', { ascending: false })
      .limit(parseInt(limit as string));

    if (start_date) {
      query = query.gte('start_time', start_date);
    }

    if (end_date) {
      query = query.lte('start_time', end_date);
    }

    const { data: sessions, error } = await query;

    if (error) {
      logger.error('Failed to fetch learning sessions:', error);
      throw createError('Failed to fetch learning sessions', 500);
    }

    // 计算会话统计
    const sessionStats = {
      total_sessions: sessions?.length || 0,
      total_duration_minutes: 0,
      average_duration_minutes: 0,
      subjects: {} as Record<string, number>,
      recent_sessions: sessions || [],
    };

    sessions?.forEach(session => {
      if (session.total_duration) {
        sessionStats.total_duration_minutes += Math.round(session.total_duration / 60);
      }
      
      if (session.subject) {
        sessionStats.subjects[session.subject] = 
          (sessionStats.subjects[session.subject] || 0) + 1;
      }
    });

    if (sessions && sessions.length > 0) {
      sessionStats.average_duration_minutes = 
        Math.round(sessionStats.total_duration_minutes / sessions.length);
    }

    res.json({
      success: true,
      data: sessionStats,
    });

  } catch (error) {
    logger.error('Error fetching session stats:', error);
    throw error;
  }
}));

/**
 * 计算学习连续天数
 */
function calculateLearningStreak(dailyStats: any[]): number {
  let streak = 0;
  const sortedStats = dailyStats.sort((a, b) => b.date.localeCompare(a.date));

  for (const stat of sortedStats) {
    if (stat.learning_time_minutes > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export { router as statsRoutes };
