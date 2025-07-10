import { performance } from 'perf_hooks';
import request from 'supertest';
import app from '../../index';
import { supabase } from '../../index';

describe('Performance Tests', () => {
  let authToken: string;
  let userId: string;
  let deviceId: string;

  beforeAll(async () => {
    // 创建测试用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'perf-test@example.com',
      password: 'testpassword123',
    });

    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`);
    }

    authToken = authData.session?.access_token || '';
    userId = authData.user?.id || '';

    // 注册测试设备
    const deviceResponse = await request(app)
      .post('/api/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        device_name: 'Performance Test Device',
        device_type: 'desktop',
        platform: 'windows',
      });

    deviceId = deviceResponse.body.data.id;
  });

  afterAll(async () => {
    // 清理测试数据
    if (userId) {
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  describe('API Response Times', () => {
    test('should respond to health check within 100ms', async () => {
      const startTime = performance.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(100);
    });

    test('should respond to authentication within 500ms', async () => {
      const startTime = performance.now();
      
      await request(app)
        .get('/api/screenshots')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(500);
    });

    test('should handle stats queries within 1000ms', async () => {
      const startTime = performance.now();
      
      await request(app)
        .get('/api/stats/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle 50 concurrent requests', async () => {
      const concurrentRequests = 50;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .get('/api/stats/today')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // 平均响应时间应该合理
      const averageResponseTime = totalTime / concurrentRequests;
      expect(averageResponseTime).toBeLessThan(2000);
    });

    test('should handle concurrent screenshot uploads', async () => {
      const concurrentUploads = 10;
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentUploads }, (_, index) =>
        request(app)
          .post('/api/screenshots/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('screenshot', testImageBuffer, `test-${index}.png`)
          .field('device_id', deviceId)
          .field('captured_at', new Date().toISOString())
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // 所有上传都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // 总时间应该合理
      expect(totalTime).toBeLessThan(30000); // 30秒内完成
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // 执行大量请求
      for (let i = 0; i < 1000; i++) {
        await request(app)
          .get('/api/stats/today')
          .set('Authorization', `Bearer ${authToken}`);
      }
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Performance', () => {
    test('should handle large dataset queries efficiently', async () => {
      // 创建大量测试数据
      const testData = Array.from({ length: 1000 }, (_, index) => ({
        user_id: userId,
        device_id: deviceId,
        file_path: `test/screenshot-${index}.png`,
        captured_at: new Date(Date.now() - index * 60000).toISOString(),
        analysis_status: 'completed',
      }));

      // 批量插入测试数据
      await supabase
        .from('screenshots')
        .insert(testData);

      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/screenshots?limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(2000); // 2秒内完成
      expect(response.body.data.screenshots.length).toBeLessThanOrEqual(100);
    });

    test('should handle complex aggregation queries', async () => {
      const startTime = performance.now();
      
      await request(app)
        .get('/api/stats/month')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(3000); // 3秒内完成
    });
  });

  describe('File Upload Performance', () => {
    test('should handle large file uploads efficiently', async () => {
      // 创建一个较大的测试文件（1MB）
      const largeImageBuffer = Buffer.alloc(1024 * 1024, 'test-data');
      
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/screenshots/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('screenshot', largeImageBuffer, 'large-test.png')
        .field('device_id', deviceId)
        .field('captured_at', new Date().toISOString())
        .expect(200);
      
      const endTime = performance.now();
      const uploadTime = endTime - startTime;
      
      expect(uploadTime).toBeLessThan(10000); // 10秒内完成
      expect(response.body.success).toBe(true);
    });
  });

  describe('Cache Performance', () => {
    test('should benefit from caching on repeated requests', async () => {
      const endpoint = '/api/stats/today';
      
      // 第一次请求（冷缓存）
      const firstStartTime = performance.now();
      await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const firstEndTime = performance.now();
      const firstRequestTime = firstEndTime - firstStartTime;
      
      // 第二次请求（热缓存）
      const secondStartTime = performance.now();
      await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const secondEndTime = performance.now();
      const secondRequestTime = secondEndTime - secondStartTime;
      
      // 缓存应该提高性能（第二次请求应该更快）
      expect(secondRequestTime).toBeLessThan(firstRequestTime);
    });
  });

  describe('Error Handling Performance', () => {
    test('should handle errors quickly', async () => {
      const startTime = performance.now();
      
      await request(app)
        .get('/api/screenshots/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      const endTime = performance.now();
      const errorResponseTime = endTime - startTime;
      
      expect(errorResponseTime).toBeLessThan(200); // 错误响应应该很快
    });

    test('should handle validation errors efficiently', async () => {
      const startTime = performance.now();
      
      await request(app)
        .post('/api/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // 空数据，应该触发验证错误
        .expect(400);
      
      const endTime = performance.now();
      const validationTime = endTime - startTime;
      
      expect(validationTime).toBeLessThan(100); // 验证错误应该很快
    });
  });

  describe('Scalability Tests', () => {
    test('should maintain performance with increasing load', async () => {
      const loadLevels = [10, 25, 50];
      const responseTimes: number[] = [];
      
      for (const load of loadLevels) {
        const startTime = performance.now();
        
        const promises = Array.from({ length: load }, () =>
          request(app)
            .get('/api/stats/today')
            .set('Authorization', `Bearer ${authToken}`)
        );
        
        await Promise.all(promises);
        
        const endTime = performance.now();
        const averageResponseTime = (endTime - startTime) / load;
        responseTimes.push(averageResponseTime);
      }
      
      // 响应时间不应该线性增长
      const firstToSecondIncrease = responseTimes[1] / responseTimes[0];
      const secondToThirdIncrease = responseTimes[2] / responseTimes[1];
      
      expect(firstToSecondIncrease).toBeLessThan(3); // 不应该超过3倍
      expect(secondToThirdIncrease).toBeLessThan(3); // 不应该超过3倍
    });
  });
});
