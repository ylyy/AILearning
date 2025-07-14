import {
  CalendarIcon,
  CameraIcon,
  ChartBarIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

interface Screenshot {
  id: string;
  timestamp: string;
  filename: string;
  path: string;
  aiAnalysis?: {
    focusScore: number;
    activity: string;
    suggestions: string[];
  };
  thumbnail?: string;
}

const ScreenshotsPage: React.FC = () => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

  useEffect(() => {
    // 模拟加载截图数据
    const loadScreenshots = async () => {
      const mockScreenshots: Screenshot[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          filename: 'screenshot_001.jpg',
          path: '/screenshots/screenshot_001.jpg',
          thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNvZGUgRWRpdG9yPC90ZXh0PgogIDxyZWN0IHg9IjIwIiB5PSI0MCIgd2lkdGg9IjI4MCIgaGVpZ2h0PSIxNjAiIGZpbGw9IiMyZDMzNDgiIHJ4PSI0Ii8+CiAgPHRleHQgeD0iMzAiIHk9IjYwIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZjhmOGYyIj5mdW5jdGlvbiBsZWFybigpIHs8L3RleHQ+CiAgPHRleHQgeD0iNDAiIHk9IjgwIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZjhmOGYyIj5jb25zb2xlLmxvZygiQUkgTGVhcm5pbmciKTs8L3RleHQ+CiAgPHRleHQgeD0iMzAiIHk9IjEwMCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMCIgZmlsbD0iI2Y4ZjhmMiI+fTwvdGV4dD4KPC9zdmc+',
          aiAnalysis: {
            focusScore: 85,
            activity: '编程学习',
            suggestions: ['保持当前专注度', '建议30分钟后休息']
          }
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          filename: 'screenshot_002.jpg',
          path: '/screenshots/screenshot_002.jpg',
          thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRvY3VtZW50YXRpb248L3RleHQ+CiAgPHJlY3QgeD0iMjAiIHk9IjQwIiB3aWR0aD0iMjgwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2ZmZmZmZiIgcng9IjQiIHN0cm9rZT0iI2U1ZTdlYiIvPgogIDx0ZXh0IHg9IjMwIiB5PSI3MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSIjMTExODI3Ij5BSSBMZWFybmluZyBHdWlkZTwvdGV4dD4KICA8dGV4dCB4PSIzMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2YjcyODAiPuacrOaWh+aho+S7i+e7jeS6hiBBSSAuLi48L3RleHQ+CiAgPHRleHQgeD0iMzAiIHk9IjEyMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNmI3MjgwIj7lrabkuaDnm5HnlKPnmoTln7rnoYAuLi48L3RleHQ+Cjwvc3ZnPg==',
          aiAnalysis: {
            focusScore: 72,
            activity: '阅读文档',
            suggestions: ['注意力有所分散', '建议关闭无关应用']
          }
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          filename: 'screenshot_003.jpg',
          path: '/screenshots/screenshot_003.jpg',
          thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPklERSAtIEZvY3VzZWQ8L3RleHQ+CiAgPHJlY3QgeD0iMjAiIHk9IjQwIiB3aWR0aD0iMjgwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iIzFmMjkzNyIgcng9IjQiLz4KICA8cmVjdCB4PSIzMCIgeT0iNTAiIHdpZHRoPSIyNjAiIGhlaWdodD0iMjAiIGZpbGw9IiMzNzQxNTEiLz4KICA8dGV4dCB4PSI0MCIgeT0iODAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2MzY2ZjEiPmNsYXNzIEFJTGVhcm5pbmdTeXN0ZW0gew0KPC90ZXh0PgogIDx0ZXh0IHg9IjUwIiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiNmOGY4ZjIiPnB1YmxpYyB2b2lkIGFuYWx5emUoKSB7PC90ZXh0PgogIDx0ZXh0IHg9IjYwIiB5PSIxMjAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiNmOGY4ZjIiPi8vIEZvY3VzZWQgY29kaW5nLi4uPC90ZXh0Pgo8L3N2Zz4=',
          aiAnalysis: {
            focusScore: 90,
            activity: '专注编码',
            suggestions: ['专注度很高', '继续保持']
          }
        }
      ];
      setScreenshots(mockScreenshots);
    };

    loadScreenshots();
  }, [selectedDate]);

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  const getFocusScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const handleDeleteScreenshot = (id: string) => {
    if (confirm('确定要删除这张截图吗？')) {
      setScreenshots(screenshots.filter(s => s.id !== id));
    }
  };

  const handleTakeScreenshot = () => {
    // 模拟拍摄新截图
    const newScreenshot: Screenshot = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      filename: `screenshot_${Date.now()}.jpg`,
      path: `/screenshots/screenshot_${Date.now()}.jpg`,
      thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWZmNmZmIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkN1cnJlbnQgU2NyZWVuPC90ZXh0PgogIDxyZWN0IHg9IjIwIiB5PSI0MCIgd2lkdGg9IjI4MCIgaGVpZ2h0PSIxNjAiIGZpbGw9IiNmOWZhZmIiIHJ4PSI0IiBzdHJva2U9IiNkMWQ1ZGIiLz4KICA8Y2lyY2xlIGN4PSIxNjAiIGN5PSIxMjAiIHI9IjMwIiBmaWxsPSIjMTBiOTgxIi8+CiAgPHRleHQgeD0iMTYwIiB5PSIxMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TkVXPC90ZXh0Pgo8L3N2Zz4=',
      aiAnalysis: {
        focusScore: Math.floor(Math.random() * 40) + 60, // 60-100
        activity: ['学习中', '编程', '阅读', '思考'][Math.floor(Math.random() * 4)],
        suggestions: ['继续保持专注', '建议适当休息', '学习状态良好'][Math.floor(Math.random() * 3)]
      }
    };

    setScreenshots([newScreenshot, ...screenshots]);
  };

  const filteredScreenshots = screenshots.filter(screenshot =>
    screenshot.aiAnalysis?.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    screenshot.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">截图记录</h1>
        <p className="mt-1 text-sm text-gray-500">
          查看和管理您的学习截图记录，以及AI分析结果。
        </p>
      </div>

      {/* 筛选和搜索 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索活动或文件名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleTakeScreenshot}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
            >
              <CameraIcon className="h-4 w-4 mr-2" />
              拍摄截图
            </button>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CameraIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">今日截图</dt>
                  <dd className="text-lg font-medium text-gray-900">{screenshots.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">平均专注度</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {screenshots.length > 0
                      ? Math.round(screenshots.reduce((sum, s) => sum + (s.aiAnalysis?.focusScore || 0), 0) / screenshots.length)
                      : 0
                    }分
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
                <EyeIcon className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">AI分析</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {screenshots.filter(s => s.aiAnalysis).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 截图列表 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            截图记录
          </h3>

          {filteredScreenshots.length === 0 ? (
            <div className="text-center py-12">
              <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无截图</h3>
              <p className="mt-1 text-sm text-gray-500">
                开始学习监控后，截图将自动保存在这里。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredScreenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {screenshot.thumbnail ? (
                          <img
                            src={screenshot.thumbnail}
                            alt={screenshot.filename}
                            className="w-16 h-12 bg-gray-200 rounded border object-cover"
                          />
                        ) : (
                          <div className="w-16 h-12 bg-gray-200 rounded border flex items-center justify-center">
                            <CameraIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {screenshot.filename}
                          </p>
                          {screenshot.aiAnalysis && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFocusScoreColor(screenshot.aiAnalysis.focusScore)}`}>
                              专注度: {screenshot.aiAnalysis.focusScore}分
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-500">
                            {formatDate(screenshot.timestamp)} {formatTime(screenshot.timestamp)}
                          </p>
                          {screenshot.aiAnalysis && (
                            <p className="text-sm text-gray-500">
                              活动: {screenshot.aiAnalysis.activity}
                            </p>
                          )}
                        </div>
                        {screenshot.aiAnalysis?.suggestions && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">
                              建议: {screenshot.aiAnalysis.suggestions.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedScreenshot(screenshot)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="查看详情"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteScreenshot(screenshot.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="删除"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 截图详情模态框 */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  截图详情
                </h3>
                <button
                  onClick={() => setSelectedScreenshot(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">关闭</span>
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-100 rounded-lg p-4 text-center">
                  {selectedScreenshot.thumbnail ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={selectedScreenshot.thumbnail}
                        alt={selectedScreenshot.filename}
                        className="max-w-full h-48 object-contain rounded border"
                      />
                      <p className="mt-2 text-sm text-gray-500">截图预览</p>
                    </div>
                  ) : (
                    <div>
                      <CameraIcon className="mx-auto h-24 w-24 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">截图预览</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900">基本信息</h4>
                  <dl className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">文件名:</dt>
                      <dd className="text-sm text-gray-900">{selectedScreenshot.filename}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">时间:</dt>
                      <dd className="text-sm text-gray-900">
                        {formatDate(selectedScreenshot.timestamp)} {formatTime(selectedScreenshot.timestamp)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {selectedScreenshot.aiAnalysis && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">AI分析结果</h4>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">专注度评分:</span>
                        <span className={`text-sm font-medium ${getFocusScoreColor(selectedScreenshot.aiAnalysis.focusScore).split(' ')[0]}`}>
                          {selectedScreenshot.aiAnalysis.focusScore}分
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">检测活动:</span>
                        <span className="text-sm text-gray-900">{selectedScreenshot.aiAnalysis.activity}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">建议:</span>
                        <ul className="mt-1 text-sm text-gray-900 list-disc list-inside">
                          {selectedScreenshot.aiAnalysis.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenshotsPage;
