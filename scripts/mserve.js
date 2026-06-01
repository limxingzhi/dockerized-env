#!/usr/bin/env node
// mserve — serve .md files with frontmatter (as a table) + mermaid + GitHub CSS
//
// Usage: mserve [port] [address]
//   port    HTTP port (default: 3456)
//   address Bind address (default: 0.0.0.0)
//
// Uses markdown-it from markserv's node_modules (must be installed globally).
// Styling via github-markdown-css CDN, mermaid via mermaid.js CDN.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const MARKDOWN_IT = '/usr/local/lib/node_modules/markserv/node_modules/markdown-it';
const PLUGINS = {
  taskLists: '/usr/local/lib/node_modules/markserv/node_modules/markdown-it-task-lists',
  highlightjs: '/usr/local/lib/node_modules/markserv/node_modules/markdown-it-highlightjs',
  emoji: '/usr/local/lib/node_modules/markserv/node_modules/markdown-it-emoji',
};

const PORT = parseInt(process.argv[2], 10) || 3456;
const ADDR = process.argv[3] || '0.0.0.0';
const ROOT = process.cwd();

// --- Markdown renderer ---
const md = require(MARKDOWN_IT)({
  html: true,
  linkify: true,
  typographer: true,
});

try { md.use(require(PLUGINS.taskLists)); } catch {}
try { md.use(require(PLUGINS.highlightjs)); } catch {}
try { md.use(require(PLUGINS.emoji)); } catch {}

// Intercept mermaid fenced blocks before highlightjs handles them
const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
  const info = tokens[idx].info.trim();
  if (info === 'mermaid') {
    return `<pre class="mermaid">${tokens[idx].content}</pre>`;
  }
  return defaultFence ? defaultFence(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
};

// --- YAML frontmatter parser (flat key: value only) ---
function parseFrontmatter(yamlStr) {
  const result = {};
  for (const line of yamlStr.split('\n')) {
    const m = line.match(/^(\w[\w-]*?):\s*(.*)/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}

// --- Render .md content to HTML ---
function renderMarkdown(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/);

  if (!match) {
    return { body: md.render(content), hasMermaid: content.includes('```mermaid') };
  }

  const frontmatter = parseFrontmatter(match[1]);
  const body = match[2];
  const entries = Object.entries(frontmatter);

  let markdown = body;
  if (entries.length > 0) {
    const table = '| | |\n|---|---|\n' +
      entries.map(([k, v]) => `| **${k}** | ${v} |`).join('\n') +
      '\n\n---\n\n';
    markdown = table + body;
  }

  return {
    body: md.render(markdown),
    hasMermaid: markdown.includes('```mermaid'),
  };
}

// --- HTML template ---
function htmlPage(title, rendered, mermaid) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
<style>
.markdown-body{max-width:900px;margin:2rem auto;padding:0 1rem}
.markdown-body .mermaid{text-align:center;margin:1em 0}
</style>
</head>
<body>
<article class="markdown-body">${rendered}</article>
${mermaid ? '<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script><script>mermaid.initialize({startOnLoad:true})</script>' : ''}
</body>
</html>`;
}

// --- MIME types ---
const MIME = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.html': 'text/html',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

// --- Server ---
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  let filePath = path.normalize(path.join(ROOT, parsed.pathname));

  // Security: ensure we don't escape ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Serve index.md or index.html for directories
  if (parsed.pathname.endsWith('/')) {
    const idx = path.join(filePath, 'index.md');
    if (fs.existsSync(idx)) filePath = idx;
    else {
      const idxHtml = path.join(filePath, 'index.html');
      if (fs.existsSync(idxHtml)) filePath = idxHtml;
    }
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.md') {
      fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) { res.writeHead(500); res.end('Error'); return; }
        const { body, hasMermaid } = renderMarkdown(content);
        const title = path.basename(filePath, '.md');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlPage(title, body, hasMermaid));
      });
    } else {
      const mime = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, ADDR, () => {
  console.error(`mserve → http://${ADDR}:${PORT}/`);
});
