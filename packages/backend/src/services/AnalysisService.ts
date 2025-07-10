import { SupabaseClient } from '@supabase/supabase-js';
import { GeminiAPI } from '@learning-supervisor/shared';
import { logger } from '../utils/logger';

export class AnalysisService {
  private supabase: SupabaseClient;
  private geminiAPI: GeminiAPI;
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.geminiAPI = new GeminiAPI();
  }

  /**
   * 启动后台分析处理
   */
  startBackgroundProcessing(): void {
    const intervalMs = parseInt(process.env.ANALYSIS_INTERVAL_MS || '30000');
    
    logger.info('Starting background analysis processing', { intervalMs });
    
    this.processingInterval = setInterval(() => {
      this.processQueuedScreenshots();
    }, intervalMs);

    // 立即处理一次
    this.processQueuedScreenshots();
  }

  /**
   * 停止后台分析处理
   */
  stopBackgroundProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('Background analysis processing stopped');
    }
  }

  /**
   * 处理队列中的截图
   */
  private async processQueuedScreenshots(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Analysis already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      const batchSize = parseInt(process.env.ANALYSIS_BATCH_SIZE || '10');
      
      // 获取待分析的截图
      const { data: screenshots, error } = await this.supabase
        .from('screenshots')
        .select('*')
        .eq('analysis_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(batchSize);

      if (error) {
        logger.error('Failed to fetch pending screenshots:', error);
        return;
      }

      if (!screenshots || screenshots.length === 0) {
        logger.debug('No pending screenshots to process');
        return;
      }

      logger.info(`Processing ${screenshots.length} screenshots`);

      // 并行处理截图（但限制并发数）
      const concurrency = 3;
      for (let i = 0; i < screenshots.length; i += concurrency) {
        const batch = screenshots.slice(i, i + concurrency);
        await Promise.allSettled(
          batch.map(screenshot => this.analyzeScreenshot(screenshot))
        );
      }

    } catch (error) {
      logger.error('Error in background processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 分析单个截图
   */
  private async analyzeScreenshot(screenshot: any): Promise<void> {
    try {
      logger.info(`Analyzing screenshot ${screenshot.id}`);

      // 更新状态为分析中
      await this.supabase
        .from('screenshots')
        .update({ analysis_status: 'analyzing' })
        .eq('id', screenshot.id);

      // 从存储中获取图片
      const { data: imageData, error: downloadError } = await this.supabase.storage
        .from('screenshots')
        .download(screenshot.file_path);

      if (downloadError || !imageData) {
        throw new Error(`Failed to download screenshot: ${downloadError?.message}`);
      }

      // 转换为base64
      const arrayBuffer = await imageData.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // 调用Gemini API分析
      const analysisResult = await this.geminiAPI.analyzeScreenshot({
        image_base64: base64,
      });

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error(`Analysis failed: ${analysisResult.error}`);
      }

      // 保存分析结果
      const { error: insertError } = await this.supabase
        .from('activity_analysis')
        .insert({
          screenshot_id: screenshot.id,
          activity_type: analysisResult.data.activity_type,
          confidence_score: analysisResult.data.confidence_score,
          description: analysisResult.data.description,
          tags: analysisResult.data.tags,
          learning_subject: analysisResult.data.learning_subject,
          productivity_score: analysisResult.data.productivity_score,
          ai_model_used: 'gemini-2.5-flash', // 从分析结果中获取
          analysis_time: new Date().toISOString(),
        });

      if (insertError) {
        throw new Error(`Failed to save analysis: ${insertError.message}`);
      }

      // 更新截图状态为已完成
      await this.supabase
        .from('screenshots')
        .update({ analysis_status: 'completed' })
        .eq('id', screenshot.id);

      logger.info(`Successfully analyzed screenshot ${screenshot.id}`, {
        activityType: analysisResult.data.activity_type,
        confidenceScore: analysisResult.data.confidence_score,
      });

      // 检查是否需要创建学习会话
      if (analysisResult.data.activity_type === 'learning') {
        await this.updateLearningSession(screenshot.user_id, analysisResult.data);
      }

    } catch (error) {
      logger.error(`Failed to analyze screenshot ${screenshot.id}:`, error);

      // 更新状态为失败
      await this.supabase
        .from('screenshots')
        .update({ analysis_status: 'failed' })
        .eq('id', screenshot.id);
    }
  }

  /**
   * 更新学习会话
   */
  private async updateLearningSession(userId: string, analysisData: any): Promise<void> {
    try {
      // 查找最近的学习会话（1小时内）
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentSession, error: sessionError } = await this.supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', oneHourAgo)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (sessionError && sessionError.code !== 'PGRST116') {
        logger.error('Error fetching learning session:', sessionError);
        return;
      }

      if (recentSession) {
        // 更新现有会话
        await this.supabase
          .from('learning_sessions')
          .update({
            screenshot_count: recentSession.screenshot_count + 1,
            subject: analysisData.learning_subject || recentSession.subject,
          })
          .eq('id', recentSession.id);
      } else {
        // 创建新的学习会话
        await this.supabase
          .from('learning_sessions')
          .insert({
            user_id: userId,
            start_time: new Date().toISOString(),
            subject: analysisData.learning_subject,
            screenshot_count: 1,
          });
      }
    } catch (error) {
      logger.error('Error updating learning session:', error);
    }
  }

  /**
   * 手动触发分析
   */
  async triggerAnalysis(screenshotId: string): Promise<void> {
    try {
      const { data: screenshot, error } = await this.supabase
        .from('screenshots')
        .select('*')
        .eq('id', screenshotId)
        .single();

      if (error || !screenshot) {
        throw new Error(`Screenshot not found: ${screenshotId}`);
      }

      await this.analyzeScreenshot(screenshot);
    } catch (error) {
      logger.error(`Failed to trigger analysis for ${screenshotId}:`, error);
      throw error;
    }
  }
}
