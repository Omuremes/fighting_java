const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('[PROXY SETUP] Setting up proxies...');
  
  // WebSocket proxy configuration
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://localhost:8082',
      changeOrigin: true,
      ws: true, // Enable WebSockets proxying
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[WS PROXY] ${req.method} ${req.url} -> http://localhost:8082${req.url}`);
      },
      onProxyReqWs: (proxyReq, req, socket, options, head) => {
        console.log(`[WS PROXY] WebSocket connection: ${req.url}`);
        // Keep socket alive to avoid disconnections
        socket.on('error', (err) => {
          console.error('[WS PROXY] Socket error:', err);
        });
      },
      onError: (err, req, res) => {
        console.error(`[WS PROXY ERROR] for ${req.method} ${req.path}:`, err);
        if (res && res.writeHead && !res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'text/plain',
          });
          res.end(`WebSocket Proxy Error: ${err.message}`);
        }
      },
      onOpen: (proxySocket) => {
        console.log('[WS PROXY] WebSocket connection opened');
        
        // Handle proxy socket close
        proxySocket.on('close', (code, reason) => {
          console.log(`[WS PROXY] WebSocket connection closed: ${code} - ${reason}`);
        });
        
        // Handle proxy socket errors
        proxySocket.on('error', (err) => {
          console.error('[WS PROXY] WebSocket proxy error:', err);
        });
      },
      // Increased timeouts for better reliability
      proxyTimeout: 30000, // 30 seconds
      timeout: 30000, // 30 seconds
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  );
  
  console.log('[PROXY SETUP] /ws WebSocket proxy configured');
  
  // Proxy for /api paths with path rewriting for proper mapping
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8082',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      // Fix: No path rewriting, keep original /api prefix
      pathRewrite: { '^/api': '/api' },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[API PROXY] ${req.method} ${req.url} -> http://localhost:8082${req.url}`);
        
        // Log request body for debugging if it's a POST or PUT
        if (['POST', 'PUT'].includes(req.method) && req.body) {
          console.log('[API PROXY] Request body:', JSON.stringify(req.body));
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`[API PROXY] Response: ${proxyRes.statusCode} for ${req.method} ${req.path}`);
      },
      onError: (err, req, res) => {
        console.error(`[API PROXY ERROR] for ${req.method} ${req.path}:`, err);
        if (res && res.writeHead && !res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'text/plain',
          });
          res.end(`API Proxy Error: ${err.message}`);
        }
      },
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true'
      },
      // Increased timeouts for better reliability
      proxyTimeout: 60000, // 60 seconds (increased from default)
      timeout: 60000       // 60 seconds (increased from default)
    })
  );
  
  console.log('[PROXY SETUP] /api proxy configured');
  
  // Add proxy for /games paths
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
  
  // Add proxy for /users paths
  app.use(
    '/users',
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
