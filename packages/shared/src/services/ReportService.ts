import { ActivityAnalysis, DailyStats, WeeklyReport, LearningGoal } from '../types';
import { AnalyticsService } from './AnalyticsService';
import { statsUtils, dateUtils } from '../utils';

export interface LearningReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  title: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalLearningTime: number;
    averageProductivity: number;
    topActivities: Array<{
      type: string;
      percentage: number;
      time: number;
    }>;
    achievements: string[];
  };
  insights: string[];
  recommendations: string[];
  charts: Array<{
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: any;
  }>;
  generatedAt: string;
}

export class ReportService {
  /**
   * 生成每日报告
   */
  static generateDailyReport(
    analyses: ActivityAnalysis[],
    goals: LearningGoal[],
    date: string = new Date().toISOString().split('T')[0]
  ): LearningReport {
    const dailyStats = AnalyticsService.generateDailyReport(analyses, date);
    const patterns = AnalyticsService.analyzeLearningPatterns(analyses);
    
    // 生成图表数据
    const hourlyData = this.generateHourlyActivityChart(analyses, date);
    const activityPieChart = this.generateActivityPieChart(dailyStats.top_activities);
    const productivityChart = this.generateProductivityChart(analyses, date);

    // 生成洞察
    const insights = this.generateDailyInsights(dailyStats, patterns, goals);
    
    // 生成建议
    const recommendations = AnalyticsService.generateLearningRecommendations(patterns, [dailyStats]);

    return {
      id: `daily-${date}`,
      type: 'daily',
      title: `${date} 学习报告`,
      period: {
        start: date,
        end: date,
      },
      summary: {
        totalLearningTime: dailyStats.learning_time,
        averageProductivity: dailyStats.productivity_score,
        topActivities: dailyStats.top_activities.map(activity => ({
          type: this.getActivityLabel(activity.activity_type),
          percentage: activity.percentage,
          time: activity.duration,
        })),
        achievements: this.getDailyAchievements(dailyStats, goals),
      },
      insights,
      recommendations,
      charts: [hourlyData, activityPieChart, productivityChart],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 生成周报告
   */
  static generateWeeklyReport(
    analyses: ActivityAnalysis[],
    goals: LearningGoal[],
    weekStart: string
  ): LearningReport {
    const weeklyReport = AnalyticsService.generateWeeklyReport(analyses, weekStart);
    const patterns = AnalyticsService.analyzeLearningPatterns(analyses);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // 生成图表数据
    const weeklyTrendChart = this.generateWeeklyTrendChart(weeklyReport.daily_stats);
    const subjectDistributionChart = this.generateSubjectDistributionChart(analyses);
    const consistencyChart = this.generateConsistencyChart(weeklyReport.daily_stats);

    // 生成洞察
    const insights = this.generateWeeklyInsights(weeklyReport, patterns, goals);
    
    // 生成建议
    const recommendations = AnalyticsService.generateLearningRecommendations(patterns, weeklyReport.daily_stats);

    return {
      id: `weekly-${weekStart}`,
      type: 'weekly',
      title: `${weekStart} 至 ${weekEndStr} 周报告`,
      period: {
        start: weekStart,
        end: weekEndStr,
      },
      summary: {
        totalLearningTime: weeklyReport.total_learning_time,
        averageProductivity: weeklyReport.average_productivity,
        topActivities: this.getWeeklyTopActivities(weeklyReport.daily_stats),
        achievements: weeklyReport.achievements.map(a => a.title),
      },
      insights,
      recommendations,
      charts: [weeklyTrendChart, subjectDistributionChart, consistencyChart],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 生成每小时活动图表
   */
  private static generateHourlyActivityChart(analyses: ActivityAnalysis[], date: string) {
    const hourlyData: Record<number, Record<string, number>> = {};
    
    // 初始化24小时数据
    for (let hour = 0; hour < 24; hour++) {
      hourlyData[hour] = {
        learning: 0,
        work: 0,
        entertainment: 0,
        social: 0,
        other: 0,
      };
    }

    // 填充数据
    analyses
      .filter(a => a.analysis_time.startsWith(date))
      .forEach(analysis => {
        const hour = new Date(analysis.analysis_time).getHours();
        hourlyData[hour][analysis.activity_type] += 15; // 15分钟
      });

    return {
      type: 'area' as const,
      title: '每小时活动分布',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [
          {
            label: '学习',
            data: Object.values(hourlyData).map(h => h.learning),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
          },
          {
            label: '工作',
            data: Object.values(hourlyData).map(h => h.work),
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgb(16, 185, 129)',
          },
          {
            label: '娱乐',
            data: Object.values(hourlyData).map(h => h.entertainment),
            backgroundColor: 'rgba(245, 158, 11, 0.5)',
            borderColor: 'rgb(245, 158, 11)',
          },
        ],
      },
    };
  }

  /**
   * 生成活动饼图
   */
  private static generateActivityPieChart(topActivities: any[]) {
    return {
      type: 'pie' as const,
      title: '活动类型分布',
      data: {
        labels: topActivities.map(a => this.getActivityLabel(a.activity_type)),
        datasets: [{
          data: topActivities.map(a => a.percentage),
          backgroundColor: [
            '#3B82F6', // 蓝色 - 学习
            '#10B981', // 绿色 - 工作
            '#F59E0B', // 黄色 - 娱乐
            '#EF4444', // 红色 - 社交
            '#8B5CF6', // 紫色 - 其他
          ],
        }],
      },
    };
  }

  /**
   * 生成生产力图表
   */
  private static generateProductivityChart(analyses: ActivityAnalysis[], date: string) {
    const hourlyProductivity: Record<number, number[]> = {};
    
    analyses
      .filter(a => a.analysis_time.startsWith(date))
      .forEach(analysis => {
        const hour = new Date(analysis.analysis_time).getHours();
        if (!hourlyProductivity[hour]) {
          hourlyProductivity[hour] = [];
        }
        hourlyProductivity[hour].push(analysis.productivity_score);
      });

    const productivityData = Object.entries(hourlyProductivity).map(([hour, scores]) => ({
      hour: parseInt(hour),
      productivity: statsUtils.average(scores),
    }));

    return {
      type: 'line' as const,
      title: '每小时生产力变化',
      data: {
        labels: productivityData.map(d => `${d.hour}:00`),
        datasets: [{
          label: '生产力评分',
          data: productivityData.map(d => d.productivity),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        }],
      },
    };
  }

  /**
   * 生成周趋势图表
   */
  private static generateWeeklyTrendChart(dailyStats: DailyStats[]) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    return {
      type: 'line' as const,
      title: '一周学习趋势',
      data: {
        labels: dailyStats.map((_, index) => weekDays[index]),
        datasets: [
          {
            label: '学习时间（分钟）',
            data: dailyStats.map(d => d.learning_time),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            yAxisID: 'y',
          },
          {
            label: '生产力评分',
            data: dailyStats.map(d => d.productivity_score),
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            yAxisID: 'y1',
          },
        ],
      },
    };
  }

  /**
   * 生成科目分布图表
   */
  private static generateSubjectDistributionChart(analyses: ActivityAnalysis[]) {
    const subjectCounts: Record<string, number> = {};
    
    analyses
      .filter(a => a.activity_type === 'learning' && a.learning_subject)
      .forEach(analysis => {
        const subject = analysis.learning_subject!;
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 15;
      });

    const sortedSubjects = Object.entries(subjectCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8); // 取前8个科目

    return {
      type: 'bar' as const,
      title: '学习科目分布',
      data: {
        labels: sortedSubjects.map(([subject]) => subject),
        datasets: [{
          label: '学习时间（分钟）',
          data: sortedSubjects.map(([,time]) => time),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        }],
      },
    };
  }

  /**
   * 生成一致性图表
   */
  private static generateConsistencyChart(dailyStats: DailyStats[]) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    return {
      type: 'bar' as const,
      title: '学习一致性',
      data: {
        labels: dailyStats.map((_, index) => weekDays[index]),
        datasets: [{
          label: '学习时间（分钟）',
          data: dailyStats.map(d => d.learning_time),
          backgroundColor: dailyStats.map(d => 
            d.learning_time > 60 ? 'rgba(16, 185, 129, 0.8)' : 
            d.learning_time > 30 ? 'rgba(245, 158, 11, 0.8)' : 
            'rgba(239, 68, 68, 0.8)'
          ),
          borderWidth: 1,
        }],
      },
    };
  }

  /**
   * 生成每日洞察
   */
  private static generateDailyInsights(
    dailyStats: DailyStats,
    patterns: any,
    goals: LearningGoal[]
  ): string[] {
    const insights: string[] = [];

    // 学习时间洞察
    if (dailyStats.learning_time > 120) {
      insights.push('今天的学习时间很充足，保持这种良好的学习习惯！');
    } else if (dailyStats.learning_time < 30) {
      insights.push('今天的学习时间较少，建议增加学习投入。');
    }

    // 生产力洞察
    if (dailyStats.productivity_score >= 8) {
      insights.push('今天的学习效率很高，专注度表现优秀！');
    } else if (dailyStats.productivity_score < 6) {
      insights.push('今天的学习效率有待提升，可能需要减少干扰因素。');
    }

    // 活动分布洞察
    const topActivity = dailyStats.top_activities[0];
    if (topActivity && topActivity.activity_type === 'entertainment' && topActivity.percentage > 40) {
      insights.push('今天娱乐时间占比较高，建议平衡学习和娱乐时间。');
    }

    return insights;
  }

  /**
   * 生成周洞察
   */
  private static generateWeeklyInsights(
    weeklyReport: WeeklyReport,
    patterns: any,
    goals: LearningGoal[]
  ): string[] {
    const insights: string[] = [];

    // 学习连续性洞察
    if (weeklyReport.learning_streak >= 7) {
      insights.push('本周保持了完美的学习连续性，非常棒！');
    } else if (weeklyReport.learning_streak >= 5) {
      insights.push('本周学习连续性良好，继续保持！');
    } else {
      insights.push('本周学习连续性有待改善，建议制定更规律的学习计划。');
    }

    // 学习时间趋势洞察
    const learningTimes = weeklyReport.daily_stats.map(d => d.learning_time);
    const isIncreasing = learningTimes[learningTimes.length - 1] > learningTimes[0];
    if (isIncreasing) {
      insights.push('本周学习时间呈上升趋势，学习动力在增强！');
    }

    // 生产力洞察
    if (weeklyReport.average_productivity >= 8) {
      insights.push('本周整体学习效率很高，学习状态优秀！');
    }

    return insights;
  }

  /**
   * 获取每日成就
   */
  private static getDailyAchievements(dailyStats: DailyStats, goals: LearningGoal[]): string[] {
    const achievements: string[] = [];

    // 检查目标完成情况
    const activeGoal = goals.find(g => g.is_active);
    if (activeGoal) {
      const targetMinutes = activeGoal.target_hours_per_day * 60;
      if (dailyStats.learning_time >= targetMinutes) {
        achievements.push(`完成学习目标"${activeGoal.title}"`);
      }
    }

    // 检查其他成就
    if (dailyStats.learning_time >= 240) {
      achievements.push('学习时间超过4小时');
    } else if (dailyStats.learning_time >= 120) {
      achievements.push('学习时间超过2小时');
    }

    if (dailyStats.productivity_score >= 9) {
      achievements.push('学习效率达到优秀水平');
    }

    return achievements;
  }

  /**
   * 获取周热门活动
   */
  private static getWeeklyTopActivities(dailyStats: DailyStats[]) {
    const activityTotals: Record<string, { time: number; count: number }> = {};

    dailyStats.forEach(day => {
      day.top_activities.forEach(activity => {
        if (!activityTotals[activity.activity_type]) {
          activityTotals[activity.activity_type] = { time: 0, count: 0 };
        }
        activityTotals[activity.activity_type].time += activity.duration;
        activityTotals[activity.activity_type].count++;
      });
    });

    const totalTime = Object.values(activityTotals).reduce((sum, a) => sum + a.time, 0);

    return Object.entries(activityTotals)
      .map(([type, data]) => ({
        type: this.getActivityLabel(type),
        percentage: Math.round((data.time / totalTime) * 100),
        time: data.time,
      }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);
  }

  /**
   * 获取活动类型标签
   */
  private static getActivityLabel(activityType: string): string {
    const labels: Record<string, string> = {
      learning: '学习',
      work: '工作',
      entertainment: '娱乐',
      social: '社交',
      other: '其他',
    };
    return labels[activityType] || activityType;
  }
}
