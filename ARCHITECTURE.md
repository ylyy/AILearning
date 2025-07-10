# 学习监督系统架构设计

## 系统概述
一个跨平台的学习监督应用，通过AI分析截图来监控和分析学习行为，提供智能督促和学习报告。

## 技术栈

### 后端服务
- **数据库**: Supabase PostgreSQL
- **API**: Supabase REST API + Edge Functions
- **AI服务**: Google Gemini API (多模型轮换)
- **文件存储**: Supabase Storage

### 前端应用
- **桌面端**: Electron + React + TypeScript
- **移动端**: React Native + TypeScript
- **共享库**: 通用业务逻辑和API客户端

### AI模型配置
- **主模型**: gemini-2.5-flash
- **备用模型**: gemini-2.5-flash-preview-04-17
- **轻量模型**: gemini-2.5-flash-lite-preview-06-17
- **API密钥**: AIzaSyBCDH1WrB7ElqMZQk26PoJVVGVORXPfVrE

## 系统架构图

```
┌─────────────────┐    ┌─────────────────┐
│   桌面客户端     │    │   移动客户端     │
│   (Electron)    │    │ (React Native)  │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
          ┌─────────────────────┐
          │    Supabase 后端     │
          │  ┌─────────────────┐ │
          │  │   PostgreSQL    │ │
          │  │     数据库      │ │
          │  └─────────────────┘ │
          │  ┌─────────────────┐ │
          │  │  Edge Functions │ │
          │  │   (AI 分析)     │ │
          │  └─────────────────┘ │
          │  ┌─────────────────┐ │
          │  │    Storage      │ │
          │  │   (截图存储)    │ │
          │  └─────────────────┘ │
          └─────────┬───────────┘
                    │
          ┌─────────────────────┐
          │   Google Gemini     │
          │      API           │
          └─────────────────────┘
```

## 数据库设计

### 用户表 (users)
```sql
- id: uuid (primary key)
- email: text
- created_at: timestamp
- updated_at: timestamp
- settings: jsonb
```

### 设备表 (devices)
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- device_name: text
- device_type: text (desktop/mobile)
- platform: text (windows/mac/ios/android)
- last_active: timestamp
- created_at: timestamp
```

### 截图记录表 (screenshots)
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- device_id: uuid (foreign key)
- file_path: text
- captured_at: timestamp
- analysis_status: text (pending/analyzing/completed/failed)
- created_at: timestamp
```

### 活动分析表 (activity_analysis)
```sql
- id: uuid (primary key)
- screenshot_id: uuid (foreign key)
- activity_type: text (learning/entertainment/work/other)
- confidence_score: float
- description: text
- tags: text[]
- learning_subject: text
- productivity_score: integer (1-10)
- ai_model_used: text
- analysis_time: timestamp
- created_at: timestamp
```

### 学习会话表 (learning_sessions)
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- start_time: timestamp
- end_time: timestamp
- total_duration: interval
- subject: text
- productivity_score: float
- screenshot_count: integer
- created_at: timestamp
```

## 核心功能模块

### 1. 截图监控模块
- 定时截图 (15分钟间隔)
- 图片压缩和优化
- 安全上传到Supabase Storage
- 失败重试机制

### 2. AI分析模块
- 图像内容识别
- 活动类型分类
- 学习内容识别
- 生产力评分
- 模型轮换机制

### 3. 数据同步模块
- 实时数据同步
- 离线数据缓存
- 冲突解决机制
- 增量同步

### 4. 学习分析模块
- 学习时间统计
- 学习效率分析
- 学习习惯分析
- 进度跟踪

### 5. 督促提醒模块
- 智能提醒算法
- 个性化鼓励消息
- 学习目标设定
- 成就系统

## 安全和隐私

### 数据加密
- 传输加密 (HTTPS/TLS)
- 存储加密 (Supabase 内置)
- 敏感数据脱敏

### 隐私保护
- 本地数据最小化
- 用户数据控制权
- 数据删除机制
- 隐私设置选项

### 权限管理
- 设备授权机制
- API访问控制
- 用户数据隔离
- 审计日志

## 部署架构

### 开发环境
- 本地Supabase实例
- 开发用AI API密钥
- 热重载开发服务器

### 生产环境
- Supabase云服务
- CDN加速
- 负载均衡
- 监控告警

## 项目结构
```
learning-supervisor/
├── packages/
│   ├── shared/           # 共享代码库
│   ├── desktop/          # 桌面端应用
│   ├── mobile/           # 移动端应用
│   └── backend/          # 后端服务
├── docs/                 # 文档
├── scripts/              # 构建脚本
└── config/               # 配置文件
```
