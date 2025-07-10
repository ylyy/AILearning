import crypto from 'crypto';
import axios from 'axios';

export interface WeChatConfig {
  appId: string;
  appSecret: string;
  token: string;
  encodingAESKey?: string;
}

export interface TemplateMessage {
  touser: string;
  template_id: string;
  url?: string;
  miniprogram?: {
    appid: string;
    pagepath: string;
  };
  data: Record<string, {
    value: string;
    color?: string;
  }>;
}

export interface ArticleMessage {
  title: string;
  description: string;
  url: string;
  picurl?: string;
}

export class WeChatService {
  private config: WeChatConfig;
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;

  constructor(config: WeChatConfig) {
    this.config = config;
  }

  /**
   * 获取访问令牌
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    
    // 如果token还有效，直接返回
    if (this.accessToken && now < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: {
          grant_type: 'client_credential',
          appid: this.config.appId,
          secret: this.config.appSecret,
        },
      });

      if (response.data.errcode) {
        throw new Error(`WeChat API error: ${response.data.errmsg}`);
      }

      this.accessToken = response.data.access_token;
      this.tokenExpireTime = now + (response.data.expires_in - 300) * 1000; // 提前5分钟过期

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get WeChat access token:', error);
      throw error;
    }
  }

  /**
   * 验证微信服务器签名
   */
  verifySignature(signature: string, timestamp: string, nonce: string): boolean {
    const token = this.config.token;
    const tmpArr = [token, timestamp, nonce].sort();
    const tmpStr = tmpArr.join('');
    const hash = crypto.createHash('sha1').update(tmpStr).digest('hex');
    
    return hash === signature;
  }

  /**
   * 发送模板消息
   */
  async sendTemplateMessage(message: TemplateMessage): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
        message
      );

      if (response.data.errcode !== 0) {
        throw new Error(`WeChat template message error: ${response.data.errmsg}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send WeChat template message:', error);
      return false;
    }
  }

  /**
   * 发送学习提醒模板消息
   */
  async sendLearningReminder(
    openId: string,
    templateId: string,
    data: {
      userName: string;
      learningGoal: string;
      todayProgress: string;
      nextTask: string;
      encouragement: string;
    }
  ): Promise<boolean> {
    const message: TemplateMessage = {
      touser: openId,
      template_id: templateId,
      data: {
        first: {
          value: `${data.userName}，您的学习提醒来了！`,
          color: '#173177',
        },
        keyword1: {
          value: data.learningGoal,
          color: '#173177',
        },
        keyword2: {
          value: data.todayProgress,
          color: '#173177',
        },
        keyword3: {
          value: data.nextTask,
          color: '#173177',
        },
        remark: {
          value: data.encouragement,
          color: '#173177',
        },
      },
    };

    return this.sendTemplateMessage(message);
  }

  /**
   * 发送学习报告模板消息
   */
  async sendLearningReport(
    openId: string,
    templateId: string,
    data: {
      userName: string;
      reportPeriod: string;
      learningTime: string;
      productivity: string;
      achievements: string;
    }
  ): Promise<boolean> {
    const message: TemplateMessage = {
      touser: openId,
      template_id: templateId,
      data: {
        first: {
          value: `${data.userName}，您的学习报告已生成！`,
          color: '#173177',
        },
        keyword1: {
          value: data.reportPeriod,
          color: '#173177',
        },
        keyword2: {
          value: data.learningTime,
          color: '#173177',
        },
        keyword3: {
          value: data.productivity,
          color: '#173177',
        },
        remark: {
          value: `本期成就：${data.achievements}`,
          color: '#173177',
        },
      },
    };

    return this.sendTemplateMessage(message);
  }

  /**
   * 发送知识推荐图文消息
   */
  async sendKnowledgeRecommendation(
    openId: string,
    articles: ArticleMessage[]
  ): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      // 创建图文消息
      const mediaResponse = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${accessToken}&type=news`,
        {
          articles: articles.map(article => ({
            title: article.title,
            author: 'Learning Supervisor',
            digest: article.description,
            content: this.generateArticleContent(article),
            content_source_url: article.url,
            thumb_media_id: '', // 需要先上传缩略图
            show_cover_pic: 1,
          })),
        }
      );

      if (mediaResponse.data.errcode) {
        throw new Error(`WeChat media upload error: ${mediaResponse.data.errmsg}`);
      }

      const mediaId = mediaResponse.data.media_id;

      // 发送图文消息
      const sendResponse = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
        {
          touser: openId,
          msgtype: 'news',
          news: {
            articles: [{
              title: articles[0].title,
              description: articles[0].description,
              url: articles[0].url,
              picurl: articles[0].picurl,
            }],
          },
        }
      );

      if (sendResponse.data.errcode !== 0) {
        throw new Error(`WeChat send message error: ${sendResponse.data.errmsg}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send WeChat knowledge recommendation:', error);
      return false;
    }
  }

  /**
   * 生成文章内容HTML
   */
  private generateArticleContent(article: ArticleMessage): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .description {
            font-size: 16px;
            color: #666;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            line-height: 1.8;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #999;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${article.title}</div>
        <div class="description">${article.description}</div>
    </div>
    
    <div class="content">
        <p>这是一个由AI智能推荐的学习内容，根据您的学习目标和进度精心挑选。</p>
        <p>点击下方链接查看完整内容：</p>
        <p><a href="${article.url}" target="_blank">查看详细内容</a></p>
    </div>
    
    <div class="footer">
        <p>Learning Supervisor - AI驱动的学习监督系统</p>
        <p>让学习更高效，让进步更可见</p>
    </div>
</body>
</html>
`;
  }

  /**
   * 处理用户消息
   */
  async handleUserMessage(message: {
    FromUserName: string;
    ToUserName: string;
    MsgType: string;
    Content?: string;
    CreateTime: number;
  }): Promise<string> {
    const { FromUserName, ToUserName, MsgType, Content } = message;

    // 根据消息类型处理
    switch (MsgType) {
      case 'text':
        return this.handleTextMessage(FromUserName, Content || '');
      
      case 'event':
        return this.handleEventMessage(FromUserName, message as any);
      
      default:
        return this.generateReplyMessage(
          FromUserName,
          ToUserName,
          '感谢您的消息！我是Learning Supervisor智能助手，可以帮助您管理学习进度。'
        );
    }
  }

  /**
   * 处理文本消息
   */
  private async handleTextMessage(fromUser: string, content: string): Promise<string> {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('学习') || lowerContent.includes('进度')) {
      return this.generateReplyMessage(
        fromUser,
        this.config.appId,
        '您可以通过Learning Supervisor应用查看详细的学习进度和统计数据。'
      );
    }

    if (lowerContent.includes('帮助') || lowerContent.includes('help')) {
      return this.generateReplyMessage(
        fromUser,
        this.config.appId,
        `Learning Supervisor功能介绍：
📊 自动学习监控
📈 智能数据分析  
🎯 个性化目标设置
📚 知识内容推荐
💡 学习建议提醒

回复"下载"获取应用下载链接`
      );
    }

    if (lowerContent.includes('下载')) {
      return this.generateReplyMessage(
        fromUser,
        this.config.appId,
        '请访问我们的官网下载Learning Supervisor应用：https://learning-supervisor.com/download'
      );
    }

    return this.generateReplyMessage(
      fromUser,
      this.config.appId,
      '感谢您的消息！回复"帮助"了解更多功能。'
    );
  }

  /**
   * 处理事件消息
   */
  private async handleEventMessage(fromUser: string, event: any): Promise<string> {
    const { Event } = event;

    switch (Event) {
      case 'subscribe':
        return this.generateReplyMessage(
          fromUser,
          this.config.appId,
          `🎉 欢迎关注Learning Supervisor！

我是您的AI学习助手，可以帮助您：
📊 监控学习进度
📈 分析学习效果
🎯 制定学习目标
📚 推荐学习内容

回复"帮助"了解更多功能
回复"下载"获取应用`
        );

      case 'unsubscribe':
        // 处理取消关注事件
        console.log(`User ${fromUser} unsubscribed`);
        return '';

      default:
        return this.generateReplyMessage(
          fromUser,
          this.config.appId,
          '感谢您的关注！回复"帮助"了解功能介绍。'
        );
    }
  }

  /**
   * 生成回复消息XML
   */
  private generateReplyMessage(toUser: string, fromUser: string, content: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    
    return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${timestamp}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(openId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openId}&lang=zh_CN`
      );

      if (response.data.errcode) {
        throw new Error(`WeChat get user info error: ${response.data.errmsg}`);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to get WeChat user info:', error);
      return null;
    }
  }

  /**
   * 创建自定义菜单
   */
  async createMenu(menu: any): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${accessToken}`,
        menu
      );

      if (response.data.errcode !== 0) {
        throw new Error(`WeChat create menu error: ${response.data.errmsg}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to create WeChat menu:', error);
      return false;
    }
  }
}
