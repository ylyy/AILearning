import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useScreenshot } from '../contexts/ScreenshotContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export const MonitoringScreen: React.FC = () => {
  const {
    isMonitoring,
    intervalMinutes,
    lastScreenshot,
    nextScreenshotTime,
    totalScreenshots,
    startMonitoring,
    stopMonitoring,
    takeManualScreenshot,
    setInterval,
    getScreenshotHistory,
  } = useScreenshot();

  const [isLoading, setIsLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [selectedInterval, setSelectedInterval] = useState(intervalMinutes);

  useEffect(() => {
    loadScreenshots();
  }, []);

  const loadScreenshots = async () => {
    try {
      const history = await getScreenshotHistory();
      setScreenshots(history);
    } catch (error) {
      console.error('Failed to load screenshots:', error);
    }
  };

  const handleToggleMonitoring = async () => {
    setIsLoading(true);
    try {
      if (isMonitoring) {
        await stopMonitoring();
        Alert.alert('监控已停止', '截图监控已成功停止。');
      } else {
        await startMonitoring();
        Alert.alert('监控已开启', '截图监控已成功开启。');
      }
    } catch (error) {
      Alert.alert('操作失败', '无法改变监控状态，请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeScreenshot = async () => {
    setIsLoading(true);
    try {
      await takeManualScreenshot();
      Alert.alert('截图成功', '截图已保存并上传。');
      await loadScreenshots();
    } catch (error) {
      Alert.alert('截图失败', '无法拍摄截图，请检查权限设置。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntervalChange = async (newInterval: number) => {
    try {
      await setInterval(newInterval);
      setSelectedInterval(newInterval);
      Alert.alert('设置成功', `截图间隔已更新为 ${newInterval} 分钟。`);
    } catch (error) {
      Alert.alert('设置失败', '无法更新截图间隔。');
    }
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '未设置';
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 标题 */}
        <View style={styles.header}>
          <Text style={styles.title}>屏幕监控</Text>
          <Text style={styles.subtitle}>管理截图监控和查看历史记录</Text>
        </View>

        {/* 监控状态卡片 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>监控状态</Text>
            <Switch
              value={isMonitoring}
              onValueChange={handleToggleMonitoring}
              disabled={isLoading}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isMonitoring ? '#2563eb' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>当前状态：</Text>
            <Text style={[styles.statusValue, isMonitoring ? styles.activeStatus : styles.inactiveStatus]}>
              {isMonitoring ? '监控中' : '已停止'}
            </Text>
          </View>

          {isMonitoring && nextScreenshotTime && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>下次截图：</Text>
              <Text style={styles.statusValue}>{formatTime(nextScreenshotTime)}</Text>
            </View>
          )}

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>总截图数：</Text>
            <Text style={styles.statusValue}>{totalScreenshots}</Text>
          </View>
        </View>

        {/* 截图间隔设置 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>截图间隔</Text>
          <View style={styles.intervalButtons}>
            {[5, 10, 15, 30, 60].map((interval) => (
              <TouchableOpacity
                key={interval}
                style={[
                  styles.intervalButton,
                  selectedInterval === interval && styles.selectedIntervalButton,
                ]}
                onPress={() => handleIntervalChange(interval)}
              >
                <Text
                  style={[
                    styles.intervalButtonText,
                    selectedInterval === interval && styles.selectedIntervalButtonText,
                  ]}
                >
                  {interval}分钟
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 手动截图按钮 */}
        <TouchableOpacity
          style={[styles.screenshotButton, isLoading && styles.disabledButton]}
          onPress={handleTakeScreenshot}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.screenshotButtonText}>立即截图</Text>
          )}
        </TouchableOpacity>

        {/* 最近截图 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>最近截图</Text>
          {screenshots.length === 0 ? (
            <Text style={styles.emptyText}>暂无截图记录</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.screenshotList}>
                {screenshots.slice(0, 5).map((screenshot, index) => (
                  <View key={index} style={styles.screenshotItem}>
                    <Image
                      source={{ uri: `file://${screenshot}` }}
                      style={styles.screenshotThumbnail}
                      resizeMode="cover"
                    />
                    <Text style={styles.screenshotTime}>
                      {new Date(screenshot.split('-').slice(-1)[0].split('.')[0]).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  activeStatus: {
    color: '#10b981',
  },
  inactiveStatus: {
    color: '#ef4444',
  },
  intervalButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  selectedIntervalButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  intervalButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectedIntervalButtonText: {
    color: '#ffffff',
  },
  screenshotButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  screenshotButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  screenshotList: {
    flexDirection: 'row',
    gap: 12,
  },
  screenshotItem: {
    alignItems: 'center',
  },
  screenshotThumbnail: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    marginBottom: 4,
  },
  screenshotTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
});