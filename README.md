# Learning Supervisor - AI驱动的学习监督系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-191970?style=flat&logo=Electron&logoColor=white)](https://www.electronjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)

一个基于AI的智能学习监督系统，通过自动截图分析、学习行为监控和个性化督促，帮助用户提高学习效率和保持学习习惯。

## ✨ 核心功能

### 🤖 AI智能分析
- **图像识别**: 使用Google Gemini API分析截图内容
- **活动分类**: 自动识别学习、工作、娱乐等活动类型
- **生产力评分**: 基于AI分析给出学习效率评分
- **学习科目识别**: 智能识别具体的学习内容和科目

### 📊 学习监控
- **自动截图**: 可配置间隔的自动屏幕截图
- **实时分析**: 实时处理和分析学习活动
- **数据统计**: 详细的学习时间、效率统计
- **趋势分析**: 学习习惯和效率趋势分析

### 🎯 智能督促
- **个性化提醒**: 基于学习模式的智能提醒
- **目标管理**: 支持多层级学习目标设置
- **进度跟踪**: 实时跟踪目标完成进度
- **成就系统**: 学习成就和里程碑记录

### 📱 多端支持
- **桌面端**: Electron跨平台桌面应用
- **移动端**: React Native移动应用
- **微信集成**: 微信公众号推送和互动
- **Web端**: 响应式Web界面

### 📈 数据分析
- **学习报告**: 日报、周报、月报生成
- **可视化图表**: 丰富的数据可视化
- **学习模式分析**: 个人学习习惯分析
- **建议推荐**: AI生成的学习建议

## 🏗️ 技术架构

### 前端技术栈
- **React 18**: 现代化的用户界面框架
- **TypeScript**: 类型安全的JavaScript超集
- **Tailwind CSS**: 实用优先的CSS框架
- **Electron**: 跨平台桌面应用框架
- **React Native**: 跨平台移动应用框架

### 后端技术栈
- **Supabase**: 开源的Firebase替代方案
- **PostgreSQL**: 强大的关系型数据库
- **Edge Functions**: 无服务器函数计算
- **Row Level Security**: 数据安全和权限控制

### AI服务
- **Google Gemini**: 多模态AI模型
- **图像分析**: 屏幕内容智能识别
- **文本生成**: 个性化内容推荐
- **模型轮换**: 多模型负载均衡

### 开发工具
- **Monorepo**: 统一的代码仓库管理
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Jest**: 单元测试框架
- **GitHub Actions**: CI/CD自动化

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 9+
- Git

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/your-username/learning-supervisor.git
cd learning-supervisor
```

2. **安装依赖**
```bash
npm install
npm run install:all
```

3. **环境配置**
```bash
cp .env.example .env
# 编辑 .env 文件，填入必要的配置
```

4. **数据库设置**
```bash
cd packages/backend
npx supabase start
npx supabase db push
npx supabase db seed
```

5. **启动开发服务**
```bash
# 启动后端服务
npm run dev:backend

# 启动桌面端应用
npm run dev:desktop

# 启动移动端应用
npm run dev:mobile
```

### 环境变量配置

创建 `.env` 文件并配置以下变量：

```env
# Supabase配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# 微信公众号配置（可选）
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
WECHAT_TOKEN=your_wechat_token

# 其他配置
NODE_ENV=development
API_BASE_URL=http://localhost:3001
```

## 📦 项目结构

```
learning-supervisor/
├── packages/
│   ├── shared/              # 共享代码库
│   │   ├── src/
│   │   │   ├── types/       # TypeScript类型定义
│   │   │   ├── utils/       # 工具函数
│   │   │   ├── constants/   # 常量定义
│   │   │   ├── api/         # API客户端
│   │   │   └── services/    # 业务服务
│   │   └── package.json
│   ├── backend/             # 后端服务
│   │   ├── src/
│   │   │   ├── routes/      # API路由
│   │   │   ├── services/    # 业务服务
│   │   │   ├── middleware/  # 中间件
│   │   │   └── tests/       # 测试文件
│   │   ├── supabase/        # Supabase配置
│   │   └── package.json
│   ├── desktop/             # 桌面端应用
│   │   ├── src/
│   │   │   ├── main/        # Electron主进程
│   │   │   └── renderer/    # React渲染进程
│   │   └── package.json
│   └── mobile/              # 移动端应用
│       ├── src/
│       │   ├── components/  # React Native组件
│       │   ├── screens/     # 页面组件
│       │   └── services/    # 移动端服务
│       └── package.json
├── scripts/                 # 构建和部署脚本
├── docs/                    # 项目文档
└── package.json             # 根package.json
```

**Learning Supervisor** - 让学习更高效，让进步更可见 🚀

## 配置真实功能

### 1. 环境变量设置

复制 `.env.example` 文件并重命名为 `.env`：

```bash
cp .env.example .env
```

然后编辑 `.env` 文件，填入您的实际配置：

- **GEMINI_API_KEY**: 从 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取您的 Gemini API 密钥
- **SUPABASE_URL** 和 **SUPABASE_ANON_KEY**: 从您的 Supabase 项目设置中获取
- **其他配置**: 根据您的需求填写其他可选配置

### 2. 安装依赖

在各个项目目录中安装必要的依赖：

```bash
# 后端
cd packages/backend
npm install

# 桌面端
cd packages/desktop
npm install

# 移动端
cd packages/mobile
npm install
# iOS 需要额外步骤
cd ios && pod install
```

### 3. 启动服务

#### 后端服务
```bash
cd packages/backend
npm run dev
```

#### 桌面端应用
```bash
cd packages/desktop
npm run dev
```

#### 移动端应用
```bash
cd packages/mobile
# Android
npm run android

# iOS
npm run ios
```

### 4. 功能说明

#### 截图功能
- **桌面端**: 使用 `screenshot-desktop` 库实现真实的屏幕截图
- **移动端**: 使用 `react-native-view-shot` 库截取屏幕内容
- 截图会自动保存到本地，并可选择上传到云端

#### AI 分析功能
- 使用 Google Gemini AI 分析截图内容
- 自动识别用户活动类型（学习、编程、阅读等）
- 提供生产力评分（1-10分）
- 给出个性化建议和改进方向

#### 数据同步
- 所有截图和分析数据通过 Supabase 实时同步
- 支持离线模式，网络恢复后自动上传
- 多设备间数据自动同步

### 5. 注意事项

- 确保您的设备有足够的存储空间用于保存截图
- AI 分析需要网络连接，离线时仅保存截图
- 首次使用时需要授予相应的权限（截图、通知等）
- 建议定期清理旧截图以节省存储空间

### 6. 故障排除

#### 截图功能不工作
- **桌面端**: 检查是否授予了屏幕录制权限（macOS）
- **移动端**: 确保已授予存储权限

#### AI 分析失败
- 检查 Gemini API 密钥是否正确
- 确认网络连接正常
- 查看后端日志了解详细错误信息

#### 数据同步问题
- 验证 Supabase 配置是否正确
- 检查网络连接状态
- 查看控制台日志获取错误详情