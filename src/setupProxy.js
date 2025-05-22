const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Прокси для /api путей
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8082',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '/api'  // сохраняем /api в пути
      },
      onProxyReq: (proxyReq, req) => {
        if (['POST', 'PUT'].includes(req.method) && req.body) {
          const bodyData = JSON.stringify(req.body);
          // Update header
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          // Write body
          proxyReq.write(bodyData);
        }
      },
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
      }
    })
  );
  
  // Добавляем прокси для /games путей
  app.use(
    '/games',
    createProxyMiddleware({
      target: 'http://localhost:8082',
      changeOrigin: true,
      secure: false,
      onProxyReq: (proxyReq, req) => {
        if (['POST', 'PUT'].includes(req.method) && req.body) {
          const bodyData = JSON.stringify(req.body);
          // Update header
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          // Write body
          proxyReq.write(bodyData);
        }
      },
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
      }
    })
  );
};
