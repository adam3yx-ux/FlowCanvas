import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function handleRequest(req, res) {
  let safePath = path.normalize(decodeURI(req.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = [];
  }

  writeHead(status, headers = {}) {
    this.statusCode = status;
    Object.assign(this.headers, headers);
  }

  write(chunk) {
    this.body.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return true;
  }

  end(chunk) {
    if (chunk) this.write(chunk);
    this.emit('finish');
  }
}

test('HTTP Server Handler - Serves index.html with correct Content-Type', async () => {
  const req = { url: '/' };
  const res = new MockResponse();

  await new Promise((resolve) => {
    res.on('finish', resolve);
    handleRequest(req, res);
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/html; charset=utf-8');
  const bodyText = Buffer.concat(res.body).toString('utf-8');
  assert.match(bodyText, /FlowCanvas/);
  assert.match(bodyText, /btn-run-workflow/);
});

test('HTTP Server Handler - Serves CSS and JS modules', async () => {
  // Test CSS
  const reqCss = { url: '/css/style.css' };
  const resCss = new MockResponse();
  await new Promise(resolve => {
    resCss.on('finish', resolve);
    handleRequest(reqCss, resCss);
  });
  assert.equal(resCss.statusCode, 200);
  assert.equal(resCss.headers['Content-Type'], 'text/css; charset=utf-8');

  // Test JS
  const reqJs = { url: '/js/app.js' };
  const resJs = new MockResponse();
  await new Promise(resolve => {
    resJs.on('finish', resolve);
    handleRequest(reqJs, resJs);
  });
  assert.equal(resJs.statusCode, 200);
  assert.equal(resJs.headers['Content-Type'], 'application/javascript; charset=utf-8');
});

test('HTTP Server Handler - Returns 404 for nonexistent routes', async () => {
  const req = { url: '/nonexistent-file.xyz' };
  const res = new MockResponse();

  await new Promise((resolve) => {
    res.on('finish', resolve);
    handleRequest(req, res);
  });

  assert.equal(res.statusCode, 404);
});
