import { LearningGoal, ActivityAnalysis, KnowledgeItem } from '../types';
import { GeminiAPI } from './GeminiAPI';

export interface KnowledgePushConfig {
  frequency: 'daily' | 'weekly' | 'bi-weekly';
  preferredTime: string; // HH:MM format
  channels: Array<'app' | 'wechat' | 'email'>;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
  contentTypes: Array<'article' | 'video' | 'exercise' | 'quiz' | 'project'>;
}

export interface PersonalizedContent {
  id: string;
  title: string;
  content: string;
  type: 'article' | 'video' | 'exercise' | 'quiz' | 'project';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // 分钟
  tags: string[];
  relatedGoals: string[];
  source: string;
  url?: string;
  createdAt: string;
}

export class KnowledgePushService {
  private geminiAPI: GeminiAPI;

  constructor() {
    this.geminiAPI = new GeminiAPI();
  }

  /**
   * 根据学习目标和历史数据生成个性化内容推荐
   */
  async generatePersonalizedContent(
    goals: LearningGoal[],
    recentAnalyses: ActivityAnalysis[],
    config: KnowledgePushConfig
  ): Promise<PersonalizedContent[]> {
    try {
      // 分析用户学习模式
      const learningPattern = this.analyzeLearningPattern(recentAnalyses);
      
      // 为每个目标生成内容
      const contentPromises = goals
        .filter(goal => goal.is_active)
        .map(goal => this.generateContentForGoal(goal, learningPattern, config));

      const contentArrays = await Promise.all(contentPromises);
      const allContent = contentArrays.flat();

      // 根据优先级和相关性排序
      return this.prioritizeContent(allContent, learningPattern);
    } catch (error) {
      console.error('Failed to generate personalized content:', error);
      return [];
    }
  }

  /**
   * 分析用户学习模式
   */
  private analyzeLearningPattern(analyses: ActivityAnalysis[]): {
    preferredSubjects: string[];
    learningTimes: number[];
    averageSessionLength: number;
    difficultyPreference: string;
    contentTypePreference: string[];
  } {
    const learningAnalyses = analyses.filter(a => a.activity_type === 'learning');
    
    // 偏好科目
    const subjectCounts: Record<string, number> = {};
    learningAnalyses.forEach(analysis => {
      if (analysis.learning_subject) {
        subjectCounts[analysis.learning_subject] = 
          (subjectCounts[analysis.learning_subject] || 0) + 1;
      }
    });

    const preferredSubjects = Object.entries(subjectCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([subject]) => subject);

    // 学习时间偏好
    const learningTimes = learningAnalyses.map(a => 
      new Date(a.analysis_time).getHours()
    );

    // 平均学习会话长度
    const averageSessionLength = learningAnalyses.length > 0 
      ? learningAnalyses.length * 15 / this.countLearningSessions(learningAnalyses)
      : 30;

    // 难度偏好（基于生产力评分）
    const avgProductivity = learningAnalyses.reduce((sum, a) => sum + a.productivity_score, 0) / learningAnalyses.length;
    const difficultyPreference = avgProductivity > 8 ? 'advanced' : 
                                avgProductivity > 6 ? 'intermediate' : 'beginner';

    return {
      preferredSubjects,
      learningTimes,
      averageSessionLength,
      difficultyPreference,
      contentTypePreference: ['article', 'video', 'exercise'], // 默认偏好
    };
  }

  /**
   * 为特定目标生成内容
   */
  private async generateContentForGoal(
    goal: LearningGoal,
    pattern: any,
    config: KnowledgePushConfig
  ): Promise<PersonalizedContent[]> {
    try {
      const prompt = this.buildContentGenerationPrompt(goal, pattern, config);
      
      const response = await this.geminiAPI.generateText({
        prompt,
        maxTokens: 2000,
        temperature: 0.7,
      });

      if (!response.success || !response.data) {
        return [];
      }

      return this.parseGeneratedContent(response.data.text, goal);
    } catch (error) {
      console.error(`Failed to generate content for goal ${goal.id}:`, error);
      return [];
    }
  }

  /**
   * 构建内容生成提示词
   */
  private buildContentGenerationPrompt(
    goal: LearningGoal,
    pattern: any,
    config: KnowledgePushConfig
  ): string {
    return `
作为一个智能学习助手，请为以下学习目标生成个性化的学习内容推荐：

学习目标：
- 标题：${goal.title}
- 描述：${goal.description}
- 目标时间：每天${goal.target_hours_per_day}小时

用户学习模式：
- 偏好科目：${pattern.preferredSubjects.join(', ')}
- 平均学习时长：${pattern.averageSessionLength}分钟
- 难度偏好：${pattern.difficultyPreference}
- 内容类型偏好：${config.contentTypes.join(', ')}

请生成3-5个相关的学习内容推荐，每个推荐包含：
1. 标题
2. 内容描述（100-200字）
3. 内容类型（article/video/exercise/quiz/project）
4. 难度级别（beginner/intermediate/advanced）
5. 预估学习时间（分钟）
6. 相关标签
7. 推荐理由

请以JSON格式返回，格式如下：
{
  "recommendations": [
    {
      "title": "标题",
      "content": "内容描述",
      "type": "article",
      "difficulty": "intermediate",
      "estimatedTime": 30,
      "tags": ["标签1", "标签2"],
      "reason": "推荐理由"
    }
  ]
}
`;
  }

  /**
   * 解析生成的内容
   */
  private parseGeneratedContent(
    generatedText: string,
    goal: LearningGoal
  ): PersonalizedContent[] {
    try {
      const parsed = JSON.parse(generatedText);
      
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        return [];
      }

      return parsed.recommendations.map((rec: any, index: number) => ({
        id: `${goal.id}-${Date.now()}-${index}`,
        title: rec.title || '未命名内容',
        content: rec.content || '',
        type: rec.type || 'article',
        difficulty: rec.difficulty || 'intermediate',
        estimatedTime: rec.estimatedTime || 30,
        tags: rec.tags || [],
        relatedGoals: [goal.id],
        source: 'AI Generated',
        createdAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to parse generated content:', error);
      return [];
    }
  }

  /**
   * 内容优先级排序
   */
  private prioritizeContent(
    content: PersonalizedContent[],
    pattern: any
  ): PersonalizedContent[] {
    return content.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // 基于偏好科目的评分
      a.tags.forEach(tag => {
        if (pattern.preferredSubjects.includes(tag)) {
          scoreA += 10;
        }
      });

      b.tags.forEach(tag => {
        if (pattern.preferredSubjects.includes(tag)) {
          scoreB += 10;
        }
      });

      // 基于难度匹配的评分
      if (a.difficulty === pattern.difficultyPreference) scoreA += 5;
      if (b.difficulty === pattern.difficultyPreference) scoreB += 5;

      // 基于学习时间匹配的评分
      if (a.estimatedTime <= pattern.averageSessionLength + 10) scoreA += 3;
      if (b.estimatedTime <= pattern.averageSessionLength + 10) scoreB += 3;

      return scoreB - scoreA;
    });
  }

  /**
   * 计算学习会话数量
   */
  private countLearningSessions(analyses: ActivityAnalysis[]): number {
    if (analyses.length === 0) return 0;

    let sessions = 1;
    let lastTime = new Date(analyses[0].analysis_time);

    for (let i = 1; i < analyses.length; i++) {
      const currentTime = new Date(analyses[i].analysis_time);
      const timeDiff = currentTime.getTime() - lastTime.getTime();
      
      if (timeDiff > 30 * 60 * 1000) { // 30分钟间隔
        sessions++;
      }
      
      lastTime = currentTime;
    }

    return sessions;
  }

  /**
   * 发送推送到不同渠道
   */
  async sendPushNotification(
    content: PersonalizedContent[],
    config: KnowledgePushConfig,
    userId: string
  ): Promise<{ success: boolean; channels: string[]; errors?: string[] }> {
    const results: { channel: string; success: boolean; error?: string }[] = [];

    for (const channel of config.channels) {
      try {
        switch (channel) {
          case 'app':
            await this.sendAppNotification(content, userId);
            results.push({ channel, success: true });
            break;
          
          case 'wechat':
            await this.sendWeChatNotification(content, userId);
            results.push({ channel, success: true });
            break;
          
          case 'email':
            await this.sendEmailNotification(content, userId);
            results.push({ channel, success: true });
            break;
        }
      } catch (error) {
        results.push({ 
          channel, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulChannels = results.filter(r => r.success).map(r => r.channel);
    const errors = results.filter(r => !r.success).map(r => `${r.channel}: ${r.error}`);

    return {
      success: successfulChannels.length > 0,
      channels: successfulChannels,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 发送应用内通知
   */
  private async sendAppNotification(content: PersonalizedContent[], userId: string): Promise<void> {
    // 这里实现应用内通知逻辑
    console.log(`Sending app notification to user ${userId}:`, content.map(c => c.title));
  }

  /**
   * 发送微信公众号推送
   */
  private async sendWeChatNotification(content: PersonalizedContent[], userId: string): Promise<void> {
    // 这里实现微信公众号推送逻辑
    // 需要集成微信公众号API
    console.log(`Sending WeChat notification to user ${userId}:`, content.map(c => c.title));
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(content: PersonalizedContent[], userId: string): Promise<void> {
    // 这里实现邮件发送逻辑
    // 可以使用SendGrid、AWS SES等服务
    console.log(`Sending email notification to user ${userId}:`, content.map(c => c.title));
  }

  /**
   * 生成学习路径推荐
   */
  async generateLearningPath(
    goal: LearningGoal,
    currentLevel: string,
    timeframe: number // 天数
  ): Promise<{
    path: Array<{
      week: number;
      topics: string[];
      resources: PersonalizedContent[];
      milestones: string[];
    }>;
    totalEstimatedTime: number;
  }> {
    try {
      const prompt = `
基于以下学习目标，生成一个${timeframe}天的详细学习路径：

目标：${goal.title}
描述：${goal.description}
当前水平：${currentLevel}
每日学习时间：${goal.target_hours_per_day}小时

请生成一个结构化的学习路径，包括：
1. 按周划分的学习主题
2. 每周的学习资源推荐
3. 重要的学习里程碑
4. 总预估学习时间

以JSON格式返回。
`;

      const response = await this.geminiAPI.generateText({
        prompt,
        maxTokens: 3000,
        temperature: 0.7,
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to generate learning path');
      }

      return JSON.parse(response.data.text);
    } catch (error) {
      console.error('Failed to generate learning path:', error);
      return {
        path: [],
        totalEstimatedTime: 0,
      };
    }
  }
}
