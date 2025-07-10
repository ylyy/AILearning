#!/bin/bash

# Learning Supervisor 部署脚本
# 用于自动化部署整个系统

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_dependencies() {
    log_info "检查部署依赖..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少以下依赖: ${missing_deps[*]}"
        exit 1
    fi
    
    log_success "所有依赖检查通过"
}

# 检查环境变量
check_environment() {
    log_info "检查环境变量..."
    
    local required_vars=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "GEMINI_API_KEY"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少以下环境变量: ${missing_vars[*]}"
        log_info "请在 .env 文件中设置这些变量"
        exit 1
    fi
    
    log_success "环境变量检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 安装根目录依赖
    npm install
    
    # 安装各包依赖
    npm run install:all
    
    log_success "依赖安装完成"
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    # 构建共享库
    log_info "构建共享库..."
    cd packages/shared
    npm run build
    cd ../..
    
    # 构建后端
    log_info "构建后端..."
    cd packages/backend
    npm run build
    cd ../..
    
    # 构建桌面端
    log_info "构建桌面端..."
    cd packages/desktop
    npm run build
    cd ../..
    
    # 构建移动端（如果需要）
    if [ "$BUILD_MOBILE" = "true" ]; then
        log_info "构建移动端..."
        cd packages/mobile
        npm run build:android
        cd ../..
    fi
    
    log_success "项目构建完成"
}

# 运行测试
run_tests() {
    log_info "运行测试套件..."
    
    # 运行单元测试
    log_info "运行单元测试..."
    npm run test:unit
    
    # 运行集成测试
    log_info "运行集成测试..."
    npm run test:integration
    
    # 运行端到端测试
    if [ "$RUN_E2E_TESTS" = "true" ]; then
        log_info "运行端到端测试..."
        npm run test:e2e
    fi
    
    log_success "所有测试通过"
}

# 部署后端服务
deploy_backend() {
    log_info "部署后端服务..."
    
    # 创建Docker镜像
    log_info "构建Docker镜像..."
    docker build -t learning-supervisor-backend:latest -f packages/backend/Dockerfile .
    
    # 部署到生产环境
    if [ "$DEPLOYMENT_TARGET" = "production" ]; then
        log_info "部署到生产环境..."
        
        # 这里可以添加具体的部署逻辑
        # 例如：推送到容器注册表、更新Kubernetes部署等
        
        # 示例：推送到Docker Hub
        if [ -n "$DOCKER_REGISTRY" ]; then
            docker tag learning-supervisor-backend:latest $DOCKER_REGISTRY/learning-supervisor-backend:latest
            docker push $DOCKER_REGISTRY/learning-supervisor-backend:latest
        fi
        
        # 示例：部署到云服务
        if [ -n "$CLOUD_DEPLOY_SCRIPT" ]; then
            bash "$CLOUD_DEPLOY_SCRIPT"
        fi
    fi
    
    log_success "后端服务部署完成"
}

# 部署数据库
deploy_database() {
    log_info "部署数据库..."
    
    # 运行数据库迁移
    log_info "运行数据库迁移..."
    cd packages/backend
    npx supabase db push
    
    # 运行种子数据
    if [ "$SEED_DATABASE" = "true" ]; then
        log_info "插入种子数据..."
        npx supabase db seed
    fi
    
    cd ../..
    
    log_success "数据库部署完成"
}

# 打包桌面应用
package_desktop() {
    log_info "打包桌面应用..."
    
    cd packages/desktop
    
    # 根据平台打包
    case "$PACKAGE_PLATFORM" in
        "windows")
            npm run package:win
            ;;
        "mac")
            npm run package:mac
            ;;
        "linux")
            npm run package:linux
            ;;
        "all")
            npm run package
            ;;
        *)
            log_warning "未指定打包平台，使用当前平台"
            npm run package
            ;;
    esac
    
    cd ../..
    
    log_success "桌面应用打包完成"
}

# 生成发布文档
generate_release_notes() {
    log_info "生成发布文档..."
    
    local version=$(node -p "require('./package.json').version")
    local release_date=$(date +"%Y-%m-%d")
    
    cat > RELEASE_NOTES.md << EOF
# Learning Supervisor v${version} 发布说明

发布日期: ${release_date}

## 新功能
- AI驱动的学习活动识别和分析
- 自动截图监控系统
- 智能学习督促和提醒
- 详细的学习报告和统计
- 跨平台桌面客户端

## 技术特性
- 基于Google Gemini的图像分析
- Supabase后端服务
- Electron桌面应用
- React Native移动应用
- TypeScript全栈开发

## 安装说明
请参考 README.md 中的安装指南。

## 已知问题
请查看 GitHub Issues 页面了解当前已知问题。

## 支持
如有问题，请通过以下方式联系我们：
- GitHub Issues
- 邮箱: support@learning-supervisor.com
EOF
    
    log_success "发布文档生成完成"
}

# 清理临时文件
cleanup() {
    log_info "清理临时文件..."
    
    # 清理构建缓存
    find . -name "node_modules/.cache" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # 清理Docker镜像（可选）
    if [ "$CLEANUP_DOCKER" = "true" ]; then
        docker system prune -f
    fi
    
    log_success "清理完成"
}

# 主部署流程
main() {
    log_info "开始部署 Learning Supervisor..."
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --production)
                DEPLOYMENT_TARGET=production
                shift
                ;;
            --platform)
                PACKAGE_PLATFORM="$2"
                shift 2
                ;;
            --mobile)
                BUILD_MOBILE=true
                shift
                ;;
            --seed-db)
                SEED_DATABASE=true
                shift
                ;;
            --cleanup)
                CLEANUP_DOCKER=true
                shift
                ;;
            -h|--help)
                echo "用法: $0 [选项]"
                echo "选项:"
                echo "  --skip-tests     跳过测试"
                echo "  --skip-build     跳过构建"
                echo "  --production     生产环境部署"
                echo "  --platform       指定打包平台 (windows|mac|linux|all)"
                echo "  --mobile         构建移动端"
                echo "  --seed-db        插入种子数据"
                echo "  --cleanup        清理Docker镜像"
                echo "  -h, --help       显示帮助信息"
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                exit 1
                ;;
        esac
    done
    
    # 执行部署步骤
    check_dependencies
    check_environment
    
    if [ "$SKIP_BUILD" != "true" ]; then
        install_dependencies
        build_project
    fi
    
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    fi
    
    deploy_database
    deploy_backend
    package_desktop
    generate_release_notes
    
    if [ "$CLEANUP_DOCKER" = "true" ]; then
        cleanup
    fi
    
    log_success "部署完成！"
    log_info "请查看 RELEASE_NOTES.md 了解详细信息"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 运行主函数
main "$@"
