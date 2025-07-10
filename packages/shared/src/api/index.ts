export { SupabaseAPI } from './supabase';
export { GeminiAPI } from './gemini';

// API客户端工厂
import { SupabaseAPI } from './supabase';
import { GeminiAPI } from './gemini';
import type { AppConfig } from '../types';

export class APIClient {
  public supabase: SupabaseAPI;
  public gemini: GeminiAPI;

  constructor(config: AppConfig) {
    this.supabase = new SupabaseAPI(
      config.supabase.url,
      config.supabase.anon_key
    );
    
    this.gemini = new GeminiAPI(config.gemini.api_key);
  }

  /**
   * 测试所有API连接
   */
  async testConnections() {
    const results = {
      supabase: false,
      gemini: false,
    };

    try {
      // 测试Supabase连接
      const user = await this.supabase.getCurrentUser();
      results.supabase = true;
    } catch (error) {
      console.warn('Supabase连接测试失败:', error);
    }

    try {
      // 测试Gemini连接
      const geminiTest = await this.gemini.testConnection();
      results.gemini = geminiTest.success;
    } catch (error) {
      console.warn('Gemini连接测试失败:', error);
    }

    return results;
  }
}
