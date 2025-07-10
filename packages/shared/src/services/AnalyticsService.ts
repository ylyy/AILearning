import { 
  ActivityAnalysis, 
  DailyStats, 
  WeeklyReport, 
  LearningSession,
  Achievement 
} from '../types';
import { statsUtils, dateUtils } from '../utils';

export class AnalyticsService {
  /**
   * 生成每日学习报告
   */
  static generateDailyReport(
    analyses: ActivityAnalysis[],
    date: string = new Date().toISOString().split('T')[0]
  ): DailyStats {
    const dayAnalyses = analyses.filter(analysis => 
      analysis.analysis_time.startsWith(date)
    );

    const totalScreenshots = dayAnalyses.length;
    const learningAnalyses = dayAnalyses.filter(a => a.activity_type === 'learning');
    const learningTime = learningAnalyses.length * 15; // 每个截图15分钟

    // 计算平均生产力
    const avgProductivity = dayAnalyses.length > 0 
      ? statsUtils.average(dayAnalyses.map(a => a.productivity_score))
      : 0;

    // 按活动类型分组
    const activityGroups = statsUtils.groupByActivityType(dayAnalyses);
    const topActivities = Object.entries(activityGroups).map(([type, analyses]) => ({
      activity_type: type as any,
      duration: analyses.length * 15,
      percentage: Math.round((analyses.length / totalScreenshots) * 100),
      productivity_score: statsUtils.average(analyses.map(a => a.productivity_score)),
    })).sort((a, b) => b.duration - a.duration);

    // 学习科目统计
    const learningSubjects = Array.from(new Set(
      learningAnalyses
        .map(a => a.learning_subject)
        .filter(Boolean)
    )) as string[];

    return {
      date,
      total_screenshots: totalScreenshots,
      learning_time: learningTime,
      productivity_score: Math.round(avgProductivity * 10) / 10,
      top_activities: topActivities,
      learning_subjects: learningSubjects,
    };
  }

  /**
   * 生成周报告
   */
  static generateWeeklyReport(
    analyses: ActivityAnalysis[],
    weekStart: string
  ): WeeklyReport {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // 生成每日统计
    const dailyStats: DailyStats[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayReport = this.generateDailyReport(analyses, dateStr);
      dailyStats.push(dayReport);
    }

    // 计算周总计
    const totalLearningTime = dailyStats.reduce((sum, day) => sum + day.learning_time, 0);
    const averageProductivity = statsUtils.average(
      dailyStats.filter(day => day.total_screenshots > 0).map(day => day.productivity_score)
    );

    // 计算学习连续天数
    const learningStreak = statsUtils.calculateLearningStreak(dailyStats);

    // 生成成就（这里是示例，实际应该从数据库获取）
    const achievements: Achievement[] = [];

    return {
      week_start: weekStart,
      week_end: weekEndStr,
      daily_stats: dailyStats,
      total_learning_time: totalLearningTime,
      average_productivity: Math.round(averageProductivity * 10) / 10,
      learning_streak: learningStreak,
      achievements,
    };
  }

  /**
   * 分析学习模式
   */
  static analyzeLearningPatterns(analyses: ActivityAnalysis[]): {
    peakHours: number[];
    preferredSubjects: string[];
    averageSessionLength: number;
    consistencyScore: number;
  } {
    const learningAnalyses = analyses.filter(a => a.activity_type === 'learning');
    
    // 分析高峰时段
    const hourCounts: Record<number, number> = {};
    learningAnalyses.forEach(analysis => {
      const hour = new Date(analysis.analysis_time).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // 偏好科目
    const subjectCounts: Record<string, number> = {};
    learningAnalyses.forEach(analysis => {
      if (analysis.learning_subject) {
        subjectCounts[analysis.learning_subject] = 
          (subjectCounts[analysis.learning_subject] || 0) + 1;
      }
    });

    const preferredSubjects = Object.entries(subjectCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([subject]) => subject);

    // 平均学习会话长度（分钟）
    const averageSessionLength = learningAnalyses.length > 0 
      ? learningAnalyses.length * 15 / this.countLearningSessions(learningAnalyses)
      : 0;

    // 一致性评分（基于每日学习时间的标准差）
    const dailyLearningTimes = this.getDailyLearningTimes(learningAnalyses);
    const consistencyScore = this.calculateConsistencyScore(dailyLearningTimes);

    return {
      peakHours,
      preferredSubjects,
      averageSessionLength: Math.round(averageSessionLength),
      consistencyScore: Math.round(consistencyScore * 100) / 100,
    };
  }

  /**
   * 计算学习会话数量
   */
  private static countLearningSessions(analyses: ActivityAnalysis[]): number {
    if (analyses.length === 0) return 0;

    let sessions = 1;
    let lastTime = new Date(analyses[0].analysis_time);

    for (let i = 1; i < analyses.length; i++) {
      const currentTime = new Date(analyses[i].analysis_time);
      const timeDiff = currentTime.getTime() - lastTime.getTime();
      
      // 如果间隔超过30分钟，认为是新的学习会话
      if (timeDiff > 30 * 60 * 1000) {
        sessions++;
      }
      
      lastTime = currentTime;
    }

    return sessions;
  }

  /**
   * 获取每日学习时间
   */
  private static getDailyLearningTimes(analyses: ActivityAnalysis[]): number[] {
    const dailyTimes: Record<string, number> = {};
    
    analyses.forEach(analysis => {
      const date = analysis.analysis_time.split('T')[0];
      dailyTimes[date] = (dailyTimes[date] || 0) + 15;
    });

    return Object.values(dailyTimes);
  }

  /**
   * 计算一致性评分
   */
  private static calculateConsistencyScore(dailyTimes: number[]): number {
    if (dailyTimes.length < 2) return 0;

    const mean = statsUtils.average(dailyTimes);
    const variance = dailyTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / dailyTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 一致性评分：标准差越小，一致性越高
    // 使用反比例函数，并归一化到0-10分
    const consistencyScore = Math.max(0, 10 - (standardDeviation / mean) * 10);
    
    return consistencyScore;
  }

  /**
   * 生成学习建议
   */
  static generateLearningRecommendations(
    patterns: ReturnType<typeof AnalyticsService.analyzeLearningPatterns>,
    dailyStats: DailyStats[]
  ): string[] {
    const recommendations: string[] = [];

    // 基于高峰时段的建议
    if (patterns.peakHours.length > 0) {
      const peakHour = patterns.peakHours[0];
      recommendations.push(
        `您在${peakHour}:00-${peakHour + 1}:00最专注，建议在这个时间段安排重要的学习任务。`
      );
    }

    // 基于学习时间的建议
    const avgDailyLearning = statsUtils.average(dailyStats.map(d => d.learning_time));
    if (avgDailyLearning < 60) {
      recommendations.push('建议每天至少学习1小时，可以分成多个小段进行。');
    } else if (avgDailyLearning > 240) {
      recommendations.push('学习时间很充足！记得适当休息，保持学习效率。');
    }

    // 基于一致性的建议
    if (patterns.consistencyScore < 5) {
      recommendations.push('建议制定固定的学习计划，保持学习的连续性。');
    } else if (patterns.consistencyScore > 8) {
      recommendations.push('您的学习习惯很好！继续保持这种规律性。');
    }

    // 基于生产力的建议
    const avgProductivity = statsUtils.average(dailyStats.map(d => d.productivity_score));
    if (avgProductivity < 6) {
      recommendations.push('建议减少干扰因素，创造更专注的学习环境。');
    }

    // 基于学习科目的建议
    if (patterns.preferredSubjects.length > 3) {
      recommendations.push('您涉猎的学习领域很广泛，建议适当聚焦以提高学习深度。');
    } else if (patterns.preferredSubjects.length === 1) {
      recommendations.push('建议适当拓展学习领域，培养多元化的知识结构。');
    }

    return recommendations;
  }

  /**
   * 检测学习异常
   */
  static detectLearningAnomalies(
    recentStats: DailyStats[],
    historicalAverage: { learningTime: number; productivity: number }
  ): Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> {
    const anomalies: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];

    // 检测学习时间异常下降
    const recentAvgLearning = statsUtils.average(recentStats.map(s => s.learning_time));
    if (recentAvgLearning < historicalAverage.learningTime * 0.5) {
      anomalies.push({
        type: 'learning_time_drop',
        message: '最近的学习时间明显减少，建议检查是否有影响学习的因素。',
        severity: 'high',
      });
    } else if (recentAvgLearning < historicalAverage.learningTime * 0.7) {
      anomalies.push({
        type: 'learning_time_decline',
        message: '学习时间有所下降，建议调整学习计划。',
        severity: 'medium',
      });
    }

    // 检测生产力异常下降
    const recentAvgProductivity = statsUtils.average(recentStats.map(s => s.productivity_score));
    if (recentAvgProductivity < historicalAverage.productivity * 0.8) {
      anomalies.push({
        type: 'productivity_drop',
        message: '学习效率有所下降，建议检查学习环境和方法。',
        severity: 'medium',
      });
    }

    // 检测连续无学习天数
    let consecutiveNoLearningDays = 0;
    for (let i = recentStats.length - 1; i >= 0; i--) {
      if (recentStats[i].learning_time === 0) {
        consecutiveNoLearningDays++;
      } else {
        break;
      }
    }

    if (consecutiveNoLearningDays >= 3) {
      anomalies.push({
        type: 'learning_break',
        message: `已连续${consecutiveNoLearningDays}天未进行学习，建议尽快恢复学习节奏。`,
        severity: 'high',
      });
    } else if (consecutiveNoLearningDays >= 2) {
      anomalies.push({
        type: 'learning_pause',
        message: '已有2天未学习，建议今天开始恢复学习。',
        severity: 'medium',
      });
    }

    return anomalies;
  }
}
