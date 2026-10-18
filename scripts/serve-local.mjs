import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

const root = resolve('frontend/dist/frontend/browser');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const proxy = http.request({ hostname: '127.0.0.1', port: 3000, path: url.pathname + url.search, method: req.method, headers: { ...req.headers, host: '127.0.0.1:3000' } }, upstream => { res.writeHead(upstream.statusCode || 502, upstream.headers); upstream.pipe(res); });
    proxy.on('error', () => { res.writeHead(502); res.end('API unavailable'); });
    req.pipe(proxy);
    return;
  }
  let file = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); res.end(); return; }
  if (!existsSync(file) || !statSync(file).isFile()) file = resolve(root, 'index.html');
  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(res);
}).listen(4200, '127.0.0.1', () => console.log('HERflow frontend on http://127.0.0.1:4200'));
