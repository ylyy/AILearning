#!/usr/bin/env node

/**
 * 简单启动脚本 - 用于快速启动AI学习监督系统
 * 不依赖复杂的workspace配置
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 启动 AI学习监督系统...\n');

// 检查环境变量
if (!fs.existsSync('.env')) {
    console.log('⚠️  未找到 .env 文件，使用默认配置');
}

// 启动函数
function startService(name, command, cwd, color = '\x1b[36m') {
    console.log(`${color}[${name}]\x1b[0m 启动中...`);
    
    const child = spawn('npm', ['run', command], {
        cwd: cwd,
        stdio: 'pipe',
        shell: true
    });

    child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
            console.log(`${color}[${name}]\x1b[0m ${line}`);
        });
    });

    child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
            console.log(`${color}[${name}]\x1b[31m ${line}\x1b[0m`);
        });
    });

    child.on('close', (code) => {
        if (code !== 0) {
            console.log(`${color}[${name}]\x1b[31m 进程退出，代码: ${code}\x1b[0m`);
        }
    });

    return child;
}

// 检查并安装依赖
async function installDependencies() {
    console.log('📦 检查依赖...');
    
    const packages = [
        { name: 'shared', path: './packages/shared' },
        { name: 'desktop', path: './packages/desktop' }
    ];

    for (const pkg of packages) {
        const nodeModulesPath = path.join(pkg.path, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            console.log(`📦 安装 ${pkg.name} 依赖...`);
            
            return new Promise((resolve, reject) => {
                const install = spawn('npm', ['install', '--legacy-peer-deps'], {
                    cwd: pkg.path,
                    stdio: 'inherit',
                    shell: true
                });

                install.on('close', (code) => {
                    if (code === 0) {
                        console.log(`✅ ${pkg.name} 依赖安装完成`);
                        resolve();
                    } else {
                        console.log(`❌ ${pkg.name} 依赖安装失败`);
                        reject(new Error(`安装失败: ${pkg.name}`));
                    }
                });
            });
        }
    }
}

// 主启动函数
async function main() {
    try {
        // 安装依赖
        await installDependencies();
        
        console.log('\n🎯 启动服务...\n');

        // 启动桌面端应用
        const desktop = startService('Desktop', 'dev', './packages/desktop', '\x1b[32m');

        // 处理退出信号
        process.on('SIGINT', () => {
            console.log('\n🛑 正在关闭服务...');
            desktop.kill();
            process.exit(0);
        });

        console.log('\n✅ 服务启动完成!');
        console.log('📱 桌面应用将在几秒钟后打开');
        console.log('🔧 如需停止服务，请按 Ctrl+C\n');

    } catch (error) {
        console.error('❌ 启动失败:', error.message);
        process.exit(1);
    }
}

main();
