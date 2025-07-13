import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  ChartBarIcon,
  CameraIcon,
  ClockIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  todayStudyTime: number;
  weekStudyTime: number;
  totalScreenshots: number;
  aiAnalysisCount: number;
  focusScore: number;
  lastScreenshot: string | null;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [stats, setStats] = useState<DashboardStats>({
    todayStudyTime: 0,
    weekStudyTime: 0,
    totalScreenshots: 0,
    aiAnalysisCount: 0,
    focusScore: 0,
    lastScreenshot: null,
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    // 模拟加载统计数据
    const loadStats = async () => {
      // 这里应该从API或本地存储加载真实数据
      setStats({
        todayStudyTime: 125, // 分钟
        weekStudyTime: 680, // 分钟
        totalScreenshots: 45,
        aiAnalysisCount: 12,
        focusScore: 78,
        lastScreenshot: new Date().toISOString(),
      });
    };

    loadStats();
  }, []);

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分钟`;
  };

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
    // 这里应该调用Electron主进程开始截图监控
    console.log('开始学习监控');
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    // 这里应该调用Electron主进程停止截图监控
    console.log('停止学习监控');
  };

  const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ComponentType<any>;
    color: string;
    description?: string;
  }> = ({ title, value, icon: Icon, color, description }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
              {description && (
                <dd className="text-sm text-gray-500">{description}</dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">学习仪表板</h1>
        <p className="mt-1 text-sm text-gray-500">
          欢迎回来，{user?.email || '用户'}！查看您的学习进度和统计信息。
        </p>
      </div>

      {/* 监控控制 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">学习监控</h2>
            <p className="text-sm text-gray-500">
              {isMonitoring ? '正在监控您的学习状态' : '点击开始监控您的学习活动'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${isMonitoring ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">
                {isMonitoring ? '监控中' : '未监控'}
              </span>
            </div>
            <button
              onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                isMonitoring
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isMonitoring ? '停止监控' : '开始监控'}
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="今日学习时间"
          value={formatTime(stats.todayStudyTime)}
          icon={ClockIcon}
          color="text-blue-500"
          description="比昨天多30分钟"
        />
        <StatCard
          title="本周学习时间"
          value={formatTime(stats.weekStudyTime)}
          icon={AcademicCapIcon}
          color="text-green-500"
          description="已完成周目标的85%"
        />
        <StatCard
          title="专注度评分"
          value={`${stats.focusScore}分`}
          icon={ChartBarIcon}
          color="text-purple-500"
          description="基于AI分析结果"
        />
        <StatCard
          title="截图记录"
          value={stats.totalScreenshots.toString()}
          icon={CameraIcon}
          color="text-yellow-500"
          description="今日新增8张"
        />
        <StatCard
          title="AI分析次数"
          value={stats.aiAnalysisCount.toString()}
          icon={ExclamationTriangleIcon}
          color="text-red-500"
          description="本周分析报告"
        />
        <StatCard
          title="学习状态"
          value="良好"
          icon={CheckCircleIcon}
          color="text-green-500"
          description="保持当前节奏"
        />
      </div>

      {/* 最近活动 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            最近活动
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CameraIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  自动截图已保存
                </p>
                <p className="text-sm text-gray-500">
                  2分钟前
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  AI分析完成：专注度良好
                </p>
                <p className="text-sm text-gray-500">
                  15分钟前
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <AcademicCapIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  学习会话开始
                </p>
                <p className="text-sm text-gray-500">
                  1小时前
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI建议 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              AI学习建议
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                根据您的学习模式分析，建议您：
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>每45分钟休息5-10分钟，提高学习效率</li>
                <li>当前专注度很好，继续保持</li>
                <li>建议在下午2-4点安排重要学习任务</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
