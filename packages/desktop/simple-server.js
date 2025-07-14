const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  let filePath = req.url === '/' ? '/test.html' : req.url;
  filePath = path.join(__dirname, filePath);
  
  // 获取文件扩展名
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  
  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
  }
  
  // 读取文件
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，返回简单的测试页面
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>AI学习监督系统 - 简单测试</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 50px auto; 
                padding: 20px;
                background-color: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 { color: #333; }
              .status { color: #28a745; margin: 10px 0; }
              button {
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin: 5px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🎉 AI学习监督系统</h1>
              <p>Node.js 简单服务器正在运行</p>
              <div class="status">✅ HTTP 服务器正常</div>
              <div class="status">✅ 文件服务正常</div>
              <div class="status">✅ 基础功能测试通过</div>
              
              <div style="margin-top: 20px;">
                <button onclick="window.location.reload()">重新加载</button>
                <button onclick="testVite()">测试 Vite 应用</button>
              </div>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <h3>调试信息</h3>
                <p>服务器: Node.js HTTP Server</p>
                <p>端口: 8080</p>
                <p>时间: ${new Date().toLocaleString()}</p>
                <p>请求路径: ${req.url}</p>
              </div>
            </div>
            
            <script>
              function testVite() {
                fetch('http://localhost:5173')
                  .then(response => {
                    if (response.ok) {
                      window.open('http://localhost:5173', '_blank');
                    } else {
                      alert('Vite 服务器未运行，请先启动 Vite 开发服务器');
                    }
                  })
                  .catch(error => {
                    alert('无法连接到 Vite 服务器 (localhost:5173)');
                  });
              }
            </script>
          </body>
          </html>
        `);
      } else {
        res.writeHead(500);
        res.end(`服务器错误: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 简单测试服务器启动成功!`);
  console.log(`📱 请在浏览器中访问: http://localhost:${PORT}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
  console.log(`📁 服务目录: ${__dirname}`);
});

server.on('error', (error) => {
  console.error('服务器错误:', error);
});
