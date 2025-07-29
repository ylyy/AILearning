import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import FormData from 'form-data';
import fetch from 'node-fetch';

interface AnalysisResult {
  id: string;
  activity_type: string;
  confidence_score: number;
  description: string;
  tags: string[];
  learning_subject?: string;
  productivity_score: number;
  reasoning: string;
}

export class APIService {
  private baseURL: string;
  private authToken: string | null = null;

  constructor() {
    // 从环境变量或配置文件读取API地址
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * 上传截图并获取AI分析结果
   */
  async uploadScreenshotAndAnalyze(screenshotPath: string): Promise<AnalysisResult | null> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(screenshotPath)) {
        throw new Error('Screenshot file not found');
      }

      // 读取截图文件
      const imageBuffer = fs.readFileSync(screenshotPath);
      const base64Image = imageBuffer.toString('base64');

      // 1. 先上传截图到后端
      const formData = new FormData();
      formData.append('screenshot', imageBuffer, {
        filename: path.basename(screenshotPath),
        contentType: 'image/png',
      });

      const uploadResponse = await fetch(`${this.baseURL}/screenshots/upload`, {
        method: 'POST',
        headers: {
          ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();
      const screenshotId = uploadResult.data?.id;

      if (!screenshotId) {
        throw new Error('No screenshot ID returned from upload');
      }

      // 2. 触发AI分析
      const analyzeResponse = await fetch(`${this.baseURL}/screenshots/${screenshotId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        },
        body: JSON.stringify({
          image_base64: base64Image,
          screenshot_id: screenshotId,
        }),
      });

      if (!analyzeResponse.ok) {
        throw new Error(`Analysis failed: ${analyzeResponse.statusText}`);
      }

      const analysisResult = await analyzeResponse.json();
      
      // 3. 等待分析完成并获取结果
      return await this.waitForAnalysisResult(screenshotId);
    } catch (error) {
      console.error('Failed to upload and analyze screenshot:', error);
      return null;
    }
  }

  /**
   * 等待AI分析完成并获取结果
   */
  private async waitForAnalysisResult(screenshotId: string, maxAttempts = 10): Promise<AnalysisResult | null> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.baseURL}/analysis/screenshot/${screenshotId}`, {
          headers: {
            ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.status === 'completed') {
            return result.data;
          }
        }

        // 等待2秒后重试
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error checking analysis result:', error);
      }
    }

    return null;
  }

  /**
   * 获取历史分析记录
   */
  async getAnalysisHistory(limit = 20): Promise<AnalysisResult[]> {
    try {
      const response = await fetch(`${this.baseURL}/analysis?limit=${limit}`, {
        headers: {
          ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get analysis history: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Failed to get analysis history:', error);
      return [];
    }
  }

  /**
   * 获取统计数据
   */
  async getStatistics(period = 'today'): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/stats/${period}`, {
        headers: {
          ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get statistics: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || {};
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {};
    }
  }
}
