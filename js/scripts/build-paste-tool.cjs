/**
 * Build a self-contained paste-tool.html with the IIFE bundle inlined.
 * Run: node js/scripts/build-paste-tool.js
 * Output: examples/paste-tool.html (double-click to open, no server needed)
 */
const fs = require('fs');
const path = require('path');

const iifePath = path.join(__dirname, '..', 'dist', 'ue-flow.iife.js');
const outPath = path.join(__dirname, '..', '..', 'examples', 'paste-tool.html');

if (!fs.existsSync(iifePath)) {
  console.error('IIFE bundle not found. Run "npm run build" first.');
  process.exit(1);
}

const jsContent = fs.readFileSync(iifePath, 'utf-8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ue-flow \u2014 Paste Tool</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #ue-flow-root { width: 100%; height: 100%; overflow: hidden; background: #0f1117; }
  </style>
</head>
<body>
  <div id="ue-flow-root"></div>
  <script>${jsContent}</script>
</body>
</html>
`;

fs.writeFileSync(outPath, html, 'utf-8');
const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
console.log(`Built ${outPath} (${sizeMB} MB)`);
