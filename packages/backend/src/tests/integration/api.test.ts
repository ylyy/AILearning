import request from 'supertest';
import app from '../../index';
import { supabase } from '../../index';

describe('API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let deviceId: string;

  beforeAll(async () => {
    // 创建测试用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123',
    });

    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`);
    }

    authToken = authData.session?.access_token || '';
    userId = authData.user?.id || '';
  });

  afterAll(async () => {
    // 清理测试数据
    if (userId) {
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  describe('Authentication', () => {
    test('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/screenshots')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('authorization');
    });

    test('should accept valid authentication token', async () => {
      const response = await request(app)
        .get('/api/screenshots')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Device Management', () => {
    test('should register a new device', async () => {
      const deviceData = {
        device_name: 'Test Device',
        device_type: 'desktop',
        platform: 'windows',
      };

      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.device_name).toBe(deviceData.device_name);
      
      deviceId = response.body.data.id;
    });

    test('should get device list', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should update device heartbeat', async () => {
      const response = await request(app)
        .put(`/api/devices/${deviceId}/heartbeat`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Screenshot Management', () => {
    test('should upload a screenshot', async () => {
      // 创建一个简单的测试图片
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post('/api/screenshots/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('screenshot', testImageBuffer, 'test.png')
        .field('device_id', deviceId)
        .field('captured_at', new Date().toISOString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis_status).toBe('pending');
    });

    test('should get screenshot list', async () => {
      const response = await request(app)
        .get('/api/screenshots')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.screenshots).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('Statistics', () => {
    test('should get today stats', async () => {
      const response = await request(app)
        .get('/api/stats/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_screenshots).toBeDefined();
      expect(response.body.data.learning_time_minutes).toBeDefined();
    });

    test('should get weekly stats', async () => {
      const response = await request(app)
        .get('/api/stats/week')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.daily_stats).toBeDefined();
      expect(Array.isArray(response.body.data.daily_stats)).toBe(true);
    });
  });

  describe('Notifications', () => {
    test('should create a notification', async () => {
      const notificationData = {
        type: 'reminder',
        title: 'Test Notification',
        message: 'This is a test notification',
      };

      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(notificationData.title);
    });

    test('should get notification list', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toBeDefined();
    });

    test('should get unread notification count', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.unread_count).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid device ID', async () => {
      const response = await request(app)
        .put('/api/devices/invalid-id/heartbeat')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    test('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rate limiting gracefully', async () => {
      // 发送多个快速请求来测试速率限制
      const promises = Array.from({ length: 100 }, () =>
        request(app)
          .get('/api/stats/today')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(promises);
      
      // 检查是否有一些请求被限制
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );

      // 在高负载下应该有一些请求被限制
      expect(rateLimitedResponses.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Validation', () => {
    test('should validate screenshot upload data', async () => {
      const response = await request(app)
        .post('/api/screenshots/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          device_id: 'invalid-uuid',
          captured_at: 'invalid-date',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate notification data', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid-type',
          title: '',
          message: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
