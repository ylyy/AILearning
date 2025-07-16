import axios, { AxiosResponse } from 'axios';
import type { 
  GeminiModel, 
  GeminiAnalysisRequest, 
  GeminiAnalysisResponse, 
  ActivityType,
  ApiResponse 
} from '../types';
import { GEMINI_CONFIG, ACTIVITY_TYPES } from '../constants';
import { validationUtils, errorUtils } from '../utils';

// Request cache for API responses
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Debounce utility
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export class GeminiAPI {
  private models: GeminiModel[];
  private currentModelIndex: number = 0;
  private apiKey: string;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(apiKey: string = GEMINI_CONFIG.API_KEY) {
    this.apiKey = apiKey;
    this.models = [...GEMINI_CONFIG.MODELS];
  }

  /**
   * 获取下一个可用的模型 - 优化版本
   */
  private getNextAvailableModel(): GeminiModel {
    const now = new Date();
    
    // 查找错误次数最少且最近未使用的模型
    const availableModels = this.models
      .filter(model => {
        const lastUsed = model.last_used ? new Date(model.last_used) : new Date(0);
        const timeSinceLastUse = now.getTime() - lastUsed.getTime();
        const minutesSinceLastUse = timeSinceLastUse / (1000 * 60);
        
        // 如果距离上次使用超过1分钟，或者从未使用过，则认为可用
        return minutesSinceLastUse > 1 || !model.last_used;
      })
      .sort((a, b) => a.error_count - b.error_count);

    if (availableModels.length > 0) {
      return availableModels[0];
    }

    // 如果没有可用模型，返回错误次数最少的
    return this.models.sort((a, b) => a.error_count - b.error_count)[0];
  }

  /**
   * 更新模型使用状态
   */
  private updateModelStatus(modelName: string, success: boolean): void {
    const model = this.models.find(m => m.name === modelName);
    if (model) {
      model.last_used = new Date().toISOString();
      if (!success) {
        model.error_count++;
      } else {
        // 成功时重置错误计数
        model.error_count = Math.max(0, model.error_count - 1);
      }
    }
  }

  /**
   * 构建分析提示词 - 缓存版本
   */
  private buildAnalysisPrompt(): string {
    const cacheKey = 'analysis_prompt';
    if (requestCache.has(cacheKey)) {
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    const prompt = `
请分析这张屏幕截图，识别用户当前正在进行的活动。请以JSON格式返回分析结果，包含以下字段：

{
  "activity_type": "学习活动类型",
  "confidence_score": 0.95,
  "description": "详细描述用户正在做什么",
  "tags": ["相关标签"],
  "learning_subject": "如果是学习活动，具体的学习科目",
  "productivity_score": 8,
  "reasoning": "分析推理过程"
}

活动类型分类标准：
- "learning": 学习活动（编程、阅读技术文档、在线课程、练习题等）
- "work": 工作活动（办公软件、邮件、会议、项目管理等）
- "entertainment": 娱乐活动（游戏、视频、音乐、社交媒体等）
- "social": 社交活动（聊天、社交网络、通讯软件等）
- "other": 其他活动

置信度评分（0-1）：表示对分类结果的确信程度
生产力评分（1-10）：1表示完全不生产，10表示高度生产

如果识别到学习活动，请在learning_subject字段中指定具体的学习科目（如：编程开发、前端技术、算法数据结构等）。

请确保返回的是有效的JSON格式。
`;

    requestCache.set(cacheKey, { data: prompt, timestamp: Date.now() });
    return prompt;
  }

  /**
   * 发送分析请求到Gemini API - 优化版本
   */
  private async sendAnalysisRequest(
    model: GeminiModel, 
    imageBase64: string, 
    prompt: string
  ): Promise<AxiosResponse> {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    return axios.post(
      `${model.endpoint}?key=${this.apiKey}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30秒超时
      }
    );
  }

  /**
   * 解析Gemini API响应 - 优化版本
   */
  private parseGeminiResponse(response: any): GeminiAnalysisResponse {
    try {
      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('无效的API响应格式');
      }

      // 尝试提取JSON内容
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('响应中未找到JSON格式的分析结果');
      }

      const analysisResult = JSON.parse(jsonMatch[0]);

      // 验证必需字段
      if (!analysisResult.activity_type || !analysisResult.confidence_score) {
        throw new Error('分析结果缺少必需字段');
      }

      // 验证活动类型
      if (!validationUtils.isValidActivityType(analysisResult.activity_type)) {
        analysisResult.activity_type = ACTIVITY_TYPES.OTHER;
      }

      // 验证置信度分数
      if (!validationUtils.isValidConfidenceScore(analysisResult.confidence_score)) {
        analysisResult.confidence_score = 0.5;
      }

      // 验证生产力评分
      if (!validationUtils.isValidProductivityScore(analysisResult.productivity_score)) {
        analysisResult.productivity_score = 5;
      }

      return {
        activity_type: analysisResult.activity_type,
        confidence_score: analysisResult.confidence_score,
        description: analysisResult.description || '无法识别具体活动',
        tags: analysisResult.tags || [],
        learning_subject: analysisResult.learning_subject || null,
        productivity_score: analysisResult.productivity_score,
        reasoning: analysisResult.reasoning || '基于图像内容分析',
      };
    } catch (error) {
      throw new Error(`解析响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 分析截图 - 优化版本，支持缓存和队列处理
   */
  async analyzeScreenshot(request: GeminiAnalysisRequest): Promise<ApiResponse<GeminiAnalysisResponse>> {
    try {
      // 检查缓存
      const cacheKey = `analysis_${request.image_hash}`;
      if (requestCache.has(cacheKey)) {
        const cached = requestCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          return { success: true, data: cached.data };
        }
      }

      // 获取可用模型
      const model = this.getNextAvailableModel();
      const prompt = this.buildAnalysisPrompt();

      // 发送请求
      const response = await this.sendAnalysisRequest(model, request.image_base64, prompt);
      
      // 解析响应
      const analysisResult = this.parseGeminiResponse(response);
      
      // 更新模型状态
      this.updateModelStatus(model.name, true);
      
      // 缓存结果
      requestCache.set(cacheKey, { data: analysisResult, timestamp: Date.now() });
      
      // 清理过期缓存
      this.cleanupCache();

      return { success: true, data: analysisResult };
    } catch (error) {
      // 更新模型状态为失败
      const model = this.getNextAvailableModel();
      this.updateModelStatus(model.name, false);
      
      return { 
        success: false, 
        error: errorUtils.formatErrorMessage(error) 
      };
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        requestCache.delete(key);
      }
    }
  }

  /**
   * 获取模型状态
   */
  getModelStatus(): GeminiModel[] {
    return [...this.models];
  }

  /**
   * 重置模型错误计数
   */
  resetModelErrors(): void {
    this.models.forEach(model => {
      model.error_count = 0;
      model.last_used = undefined;
    });
  }

  /**
   * 测试连接 - 优化版本
   */
  async testConnection(): Promise<ApiResponse> {
    try {
      const model = this.models[0];
      const testPrompt = "请回复'连接测试成功'";
      
      const response = await axios.post(
        `${model.endpoint}?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: testPrompt }] }],
          generationConfig: { maxOutputTokens: 10 }
        },
        { timeout: 10000 }
      );

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: errorUtils.formatErrorMessage(error) 
      };
    }
  }

  /**
   * 清理所有缓存
   */
  clearCache(): void {
    requestCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: requestCache.size,
      keys: Array.from(requestCache.keys())
    };
  }
}
