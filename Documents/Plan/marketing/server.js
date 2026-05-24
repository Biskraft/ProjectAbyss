// ECHORIS Marketing Kanban — Local Server
// 실행: node server.js
// 접속: http://localhost:4321

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = 4321;
const DIR       = __dirname;
const DATA_FILE = path.join(DIR, 'calendar.json');
const HTML_FILE = path.join(DIR, 'kanban.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.js':   'text/javascript',
  '.css':  'text/css',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // GET / → kanban.html
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    res.end(fs.readFileSync(HTML_FILE));
    return;
  }

  // GET /data → calendar.json
  if (req.method === 'GET' && req.url === '/data') {
    res.writeHead(200, { 'Content-Type': MIME['.json'] });
    res.end(fs.readFileSync(DATA_FILE));
    return;
  }

  // POST /save → calendar.json 갱신
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        data.meta.last_updated = new Date().toISOString().slice(0, 10);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`[save] ${data.meta.last_updated} wishlist=${data.meta.wishlist_count}`);
        res.writeHead(200, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ECHORIS Kanban → http://localhost:${PORT}\n`);
});
