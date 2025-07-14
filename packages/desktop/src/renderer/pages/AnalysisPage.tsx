import {
  AcademicCapIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

interface AnalysisData {
  dailyFocus: { date: string; score: number }[];
  weeklyStudyTime: { week: string; hours: number }[];
  activityBreakdown: { activity: string; percentage: number; color: string }[];
  focusTrends: {
    current: number;
    previous: number;
    change: number;
  };
  recommendations: string[];
}

const AnalysisPage: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模拟加载分析数据
    const loadAnalysisData = async () => {
      setIsLoading(true);

      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockData: AnalysisData = {
        dailyFocus: [
          { date: '2024-01-01', score: 75 },
          { date: '2024-01-02', score: 82 },
          { date: '2024-01-03', score: 68 },
          { date: '2024-01-04', score: 90 },
          { date: '2024-01-05', score: 85 },
          { date: '2024-01-06', score: 78 },
          { date: '2024-01-07', score: 88 },
        ],
        weeklyStudyTime: [
          { week: '第1周', hours: 25 },
          { week: '第2周', hours: 32 },
          { week: '第3周', hours: 28 },
          { week: '第4周', hours: 35 },
        ],
        activityBreakdown: [
          { activity: '编程学习', percentage: 45, color: 'bg-blue-500' },
          { activity: '阅读文档', percentage: 25, color: 'bg-green-500' },
          { activity: '视频学习', percentage: 20, color: 'bg-yellow-500' },
          { activity: '其他', percentage: 10, color: 'bg-gray-500' },
        ],
        focusTrends: {
          current: 82,
          previous: 75,
          change: 9.3,
        },
        recommendations: [
          '您的专注度在下午2-4点最高，建议安排重要学习任务',
          '编程学习时专注度最好，可以增加此类活动的比重',
          '建议每45分钟休息5-10分钟，有助于保持专注',
          '周末的学习时间较少，可以适当增加',
        ],
      };

      setAnalysisData(mockData);
      setIsLoading(false);
    };

    loadAnalysisData();
  }, [selectedPeriod]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">暂无分析数据</h3>
        <p className="mt-1 text-sm text-gray-500">
          开始学习监控后，系统将为您生成详细的分析报告。
        </p>
      </div>
    );
  }

  const TrendIndicator: React.FC<{ value: number }> = ({ value }) => {
    const isPositive = value > 0;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';

    return (
      <div className={`flex items-center ${colorClass}`}>
        <span className="text-sm mr-1">
          {isPositive ? '↗' : '↘'}
        </span>
        <span className="text-sm font-medium">
          {isPositive ? '+' : ''}{value.toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">学习分析</h1>
          <p className="mt-1 text-sm text-gray-500">
            基于AI分析的学习数据洞察和建议。
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'quarter')}
            className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="week">最近一周</option>
            <option value="month">最近一月</option>
            <option value="quarter">最近三月</option>
          </select>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">平均专注度</dt>
                  <dd className="flex items-center">
                    <div className="text-lg font-medium text-gray-900">
                      {analysisData.focusTrends.current}分
                    </div>
                    <div className="ml-2">
                      <TrendIndicator value={analysisData.focusTrends.change} />
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">总学习时间</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {analysisData.weeklyStudyTime.reduce((sum, week) => sum + week.hours, 0)}小时
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AcademicCapIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">主要活动</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {analysisData.activityBreakdown[0].activity}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">改进幅度</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    +{analysisData.focusTrends.change.toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 专注度趋势图 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            专注度趋势
          </h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {analysisData.dailyFocus.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-indigo-500 rounded-t"
                  style={{ height: `${(day.score / 100) * 200}px` }}
                  title={`${day.score}分`}
                />
                <div className="mt-2 text-xs text-gray-500 text-center">
                  {new Date(day.date).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-xs font-medium text-gray-900">
                  {day.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 活动分布 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              学习活动分布
            </h3>
            <div className="space-y-3">
              {analysisData.activityBreakdown.map((activity, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {activity.activity}
                      </span>
                      <span className="text-sm text-gray-500">
                        {activity.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${activity.color}`}
                        style={{ width: `${activity.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 学习时间统计 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              每周学习时间
            </h3>
            <div className="h-48 flex items-end justify-between space-x-4">
              {analysisData.weeklyStudyTime.map((week, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full bg-green-500 rounded-t"
                    style={{ height: `${(week.hours / 40) * 160}px` }}
                    title={`${week.hours}小时`}
                  />
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {week.week}
                  </div>
                  <div className="text-xs font-medium text-gray-900">
                    {week.hours}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI建议 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            AI学习建议
          </h3>
          <div className="space-y-3">
            {analysisData.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
