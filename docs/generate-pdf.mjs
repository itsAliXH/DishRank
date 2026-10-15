/**
 * Generate docs/DishRank-Feature-Audit.pdf from docs/FEATURE_AUDIT.md
 * Renders Mermaid diagrams via mermaid.js in headless Chromium.
 *
 * Usage: node docs/generate-pdf.mjs
 * Or:    npm run docs:pdf
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MD_PATH = join(__dirname, 'FEATURE_AUDIT.md');
const PDF_PATH = join(__dirname, 'DishRank-Feature-Audit.pdf');
const HTML_PATH = join(__dirname, '.audit-preview.html');

async function main() {
  const md = readFileSync(MD_PATH, 'utf8');

  // Extract mermaid blocks so we can give them language-mermaid class reliably
  const mermaidBlocks = [];
  const mdForMarked = md.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
    const i = mermaidBlocks.length;
    mermaidBlocks.push(code.trim());
    return `\n\n<div class="mermaid-placeholder" data-mermaid-index="${i}"></div>\n\n`;
  });

  const bodyHtml = await marked.parse(mdForMarked, { async: true });

  // Restore mermaid divs with actual source
  const withMermaid = bodyHtml.replace(
    /<div class="mermaid-placeholder" data-mermaid-index="(\d+)"><\/div>/g,
    (_, idx) => {
      const code = mermaidBlocks[Number(idx)] || '';
      // Keep diagram source as text; escape only HTML-sensitive chars that break the DOM
      const safe = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<pre class="mermaid">${safe}</pre>`;
    },
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DishRank Feature Audit</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    :root {
      color-scheme: light;
      --fg: #1a1a1a;
      --muted: #555;
      --border: #ddd;
      --bg: #fff;
      --code-bg: #f5f5f5;
      --accent: #c45c26;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: var(--fg);
      background: var(--bg);
      max-width: 820px;
      margin: 0 auto;
      padding: 28px 32px 48px;
    }
    h1 {
      font-size: 22pt;
      border-bottom: 3px solid var(--accent);
      padding-bottom: 8px;
      margin-top: 0;
    }
    h2 {
      font-size: 15pt;
      margin-top: 1.6em;
      page-break-after: avoid;
      color: #222;
      border-bottom: 1px solid var(--border);
      padding-bottom: 4px;
    }
    h3 {
      font-size: 12.5pt;
      margin-top: 1.2em;
      page-break-after: avoid;
    }
    p, li { orphans: 3; widows: 3; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin: 0.8em 0 1.2em;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th { background: #f0f0f0; font-weight: 600; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.88em;
      background: var(--code-bg);
      padding: 1px 4px;
      border-radius: 3px;
    }
    pre:not(.mermaid) {
      background: var(--code-bg);
      padding: 10px 12px;
      overflow-x: auto;
      font-size: 8.5pt;
      border-radius: 4px;
    }
    pre.mermaid {
      background: #fafafa;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
      text-align: center;
      page-break-inside: avoid;
      margin: 1em 0;
    }
    .mermaid svg { max-width: 100%; height: auto; }
    hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
    strong { font-weight: 600; }
    a { color: var(--accent); text-decoration: none; }
    .doc-meta {
      color: var(--muted);
      font-size: 9.5pt;
      margin-bottom: 1.5em;
    }
    @page { margin: 16mm 14mm; size: A4; }
    @media print {
      body { padding: 0; max-width: none; }
      a { color: inherit; }
    }
  </style>
</head>
<body>
${withMermaid}
<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'neutral',
    securityLevel: 'loose',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: true },
  });
</script>
</body>
</html>`;

  mkdirSync(__dirname, { recursive: true });
  writeFileSync(HTML_PATH, html, 'utf8');

  console.log('Launching Chromium…');
  const systemChrome =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : process.platform === 'win32'
        ? 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe'
        : undefined);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: systemChrome,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 920, height: 1280, deviceScaleFactor: 2 });
    await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle0', timeout: 120_000 });

    // Wait until mermaid has replaced pre.mermaid with SVG
    await page.waitForFunction(
      () => {
        const nodes = [...document.querySelectorAll('.mermaid')];
        if (nodes.length === 0) return true;
        return nodes.every((n) => n.querySelector('svg'));
      },
      { timeout: 90_000 },
    );

    const diagramCount = await page.$$eval('.mermaid svg', (svgs) => svgs.length);
    console.log(`Rendered ${diagramCount} Mermaid diagram(s)`);

    // Extra beat for layout
    await new Promise((r) => setTimeout(r, 800));

    await page.pdf({
      path: PDF_PATH,
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size:8px;width:100%;padding:0 12mm;color:#666;display:flex;justify-content:space-between;">
          <span>DishRank Feature Audit</span>
          <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>`,
    });

    console.log(`Wrote ${PDF_PATH}`);
  } finally {
    await browser.close();
  }

  try {
    const { unlinkSync } = await import('node:fs');
    unlinkSync(HTML_PATH);
  } catch {
    /* ignore */
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
