import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import {
  CogIcon,
  BellIcon,
  CameraIcon,
  ClockIcon,
  ShieldCheckIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'general' | 'monitoring' | 'notifications' | 'privacy'>('general');

  const tabs = [
    { id: 'general', name: '常规设置', icon: CogIcon },
    { id: 'monitoring', name: '监控设置', icon: CameraIcon },
    { id: 'notifications', name: '通知设置', icon: BellIcon },
    { id: 'privacy', name: '隐私设置', icon: ShieldCheckIcon },
  ];

  const handleSettingChange = (key: string, value: any) => {
    updateSettings({ [key]: value });
  };

  const SettingItem: React.FC<{
    title: string;
    description: string;
    children: React.ReactNode;
  }> = ({ title, description, children }) => (
    <div className="py-4 border-b border-gray-200 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="ml-4">
          {children}
        </div>
      </div>
    </div>
  );

  const Toggle: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
  }> = ({ enabled, onChange }) => (
    <button
      type="button"
      className={`${
        enabled ? 'bg-indigo-600' : 'bg-gray-200'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
      onClick={() => onChange(!enabled)}
    >
      <span
        className={`${
          enabled ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">设置</h1>
        <p className="mt-1 text-sm text-gray-500">
          配置您的学习监督系统偏好设置。
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        {/* 标签页导航 */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 标签页内容 */}
        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">常规设置</h3>
                <div className="space-y-4">
                  <SettingItem
                    title="自动启动"
                    description="系统启动时自动运行学习监督系统"
                  >
                    <Toggle
                      enabled={settings.autoStart}
                      onChange={(enabled) => handleSettingChange('autoStart', enabled)}
                    />
                  </SettingItem>

                  <SettingItem
                    title="最小化到系统托盘"
                    description="关闭窗口时最小化到系统托盘而不是退出"
                  >
                    <Toggle
                      enabled={settings.minimizeToTray}
                      onChange={(enabled) => handleSettingChange('minimizeToTray', enabled)}
                    />
                  </SettingItem>

                  <SettingItem
                    title="主题设置"
                    description="选择应用程序的外观主题"
                  >
                    <select
                      value={settings.theme || 'light'}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="light">浅色</option>
                      <option value="dark">深色</option>
                      <option value="auto">跟随系统</option>
                    </select>
                  </SettingItem>

                  <SettingItem
                    title="语言设置"
                    description="选择应用程序的显示语言"
                  >
                    <select
                      value={settings.language || 'zh-CN'}
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </SettingItem>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">监控设置</h3>
                <div className="space-y-4">
                  <SettingItem
                    title="截图间隔"
                    description="自动截图的时间间隔（分钟）"
                  >
                    <select
                      value={settings.screenshotInterval}
                      onChange={(e) => handleSettingChange('screenshotInterval', parseInt(e.target.value))}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value={5}>5分钟</option>
                      <option value={10}>10分钟</option>
                      <option value={15}>15分钟</option>
                      <option value={30}>30分钟</option>
                      <option value={60}>60分钟</option>
                    </select>
                  </SettingItem>

                  <SettingItem
                    title="截图质量"
                    description="截图的图像质量设置"
                  >
                    <select
                      value={settings.screenshotQuality || 'medium'}
                      onChange={(e) => handleSettingChange('screenshotQuality', e.target.value)}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="low">低质量</option>
                      <option value="medium">中等质量</option>
                      <option value="high">高质量</option>
                    </select>
                  </SettingItem>

                  <SettingItem
                    title="AI分析"
                    description="启用AI自动分析截图内容"
                  >
                    <Toggle
                      enabled={settings.aiAnalysis !== false}
                      onChange={(enabled) => handleSettingChange('aiAnalysis', enabled)}
                    />
                  </SettingItem>

                  <SettingItem
                    title="智能暂停"
                    description="检测到非学习活动时自动暂停监控"
                  >
                    <Toggle
                      enabled={settings.smartPause !== false}
                      onChange={(enabled) => handleSettingChange('smartPause', enabled)}
                    />
                  </SettingItem>

                  <SettingItem
                    title="存储位置"
                    description="截图文件的保存位置"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={settings.storagePath || '~/Documents/LearningScreenshots'}
                        onChange={(e) => handleSettingChange('storagePath', e.target.value)}
                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        readOnly
                      />
                      <button className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        浏览
                      </button>
                    </div>
                  </SettingItem>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">通知设置</h3>
                <div className="space-y-4">
                  <SettingItem
                    title="启用通知"
                    description="接收学习提醒和分析结果通知"
                  >
                    <Toggle
                      enabled={settings.notifications}
                      onChange={(enabled) => handleSettingChange('notifications', enabled)}
                    />
                  </SettingItem>

                  <SettingItem
                    title="休息提醒"
                    description="定时提醒您休息放松"
                  >
                    <Toggle
                      enabled={settings.breakReminders !== false}
                      onChange={(enabled) => handleSettingChange('breakReminders', enabled)}
                    />
                  </SettingItem>

                  <SettingItem
                    title="休息间隔"
                    description="休息提醒的时间间隔"
                  >
                    <select
                      value={settings.breakInterval || 45}
                      onChange={(e) => handleSettingChange('breakInterval', parseInt(e.target.value))}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={!settings.breakReminders}
                    >
                      <option value={25}>25分钟</option>
                      <option value={45}>45分钟</option>
                      <option value={60}>60分钟</option>
                      <option value={90}>90分钟</option>
                    </select>
                  </SettingItem>

                  <SettingItem
                    title="专注度警告"
                    description="专注度过低时发送警告通知"
                  >
                    <Toggle
                      enabled={settings.focusAlerts !== false}
                      onChange={(enabled) => handleSettingChange('focusAlerts', enabled)}
                    />
                  </SettingItem>

                  <SettingItem
                    title="每日总结"
                    description="每天结束时发送学习总结报告"
                  >
                    <Toggle
                      enabled={settings.dailySummary !== false}
                      onChange={(enabled) => handleSettingChange('dailySummary', enabled)}
                    />
                  </SettingItem>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">隐私设置</h3>
                <div className="space-y-4">
                  <SettingItem
                    title="数据加密"
                    description="加密存储的截图和分析数据"
                  >
                    <Toggle
                      enabled={settings.dataEncryption !== false}
                      onChange={(enabled) => handleSettingChange('dataEncryption', enabled)}
                    />
                  </SettingItem>

                  <SettingItem
                    title="自动清理"
                    description="自动删除超过指定天数的旧数据"
                  >
                    <Toggle
                      enabled={settings.autoCleanup !== false}
                      onChange={(enabled) => handleSettingChange('autoCleanup', enabled)}
                    />
                  </SettingItem>

                  <SettingItem
                    title="保留天数"
                    description="数据保留的天数"
                  >
                    <select
                      value={settings.retentionDays || 30}
                      onChange={(e) => handleSettingChange('retentionDays', parseInt(e.target.value))}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={!settings.autoCleanup}
                    >
                      <option value={7}>7天</option>
                      <option value={30}>30天</option>
                      <option value={90}>90天</option>
                      <option value={365}>1年</option>
                    </select>
                  </SettingItem>

                  <SettingItem
                    title="匿名统计"
                    description="发送匿名使用统计以帮助改进产品"
                  >
                    <Toggle
                      enabled={settings.anonymousStats !== false}
                      onChange={(enabled) => handleSettingChange('anonymousStats', enabled)}
                    />
                  </SettingItem>

                  <div className="pt-4">
                    <button className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700">
                      清除所有数据
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      这将删除所有截图、分析数据和设置。此操作不可撤销。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <button
          type="button"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          保存设置
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
