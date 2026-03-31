#!/usr/bin/env bun
/**
 * Build frontend using Bun's bundler (replaces vite build).
 */
import fs from 'fs';
import path from 'path';

const outdir = './dist';

// Clean output directory
if (fs.existsSync(outdir)) {
  fs.rmSync(outdir, { recursive: true });
}
fs.mkdirSync(outdir, { recursive: true });

// Process Tailwind CSS before bundling
console.log('Processing Tailwind CSS...');
const tailwind = Bun.spawnSync({
  cmd: ['bunx', '--bun', 'tailwindcss', '-i', './src/styles.css', '-o', './src/tailwind.css', '--minify'],
  stdout: 'inherit',
  stderr: 'inherit',
});
if (tailwind.exitCode !== 0) {
  console.error('Tailwind CSS processing failed');
  process.exit(1);
}
console.log('Tailwind CSS processed.');

// Bundle the React app
const result = await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir,
  minify: true,
  splitting: true,
  target: 'browser',
  naming: {
    entry: '[name].[ext]',
    asset: '[name].[ext]',
  },
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Report output files
const outputFiles = result.outputs.map((o) => path.relative(process.cwd(), o.path));
console.log('Bundled:', outputFiles.join(', '));

// Check if CSS was generated
const cssFiles = outputFiles.filter((f) => f.endsWith('.css'));
const jsFiles = outputFiles.filter((f) => f.endsWith('.js'));

// Generate index.html from template
const template = fs.readFileSync('./index.html', 'utf8');
const cssLinks = cssFiles
  .map((f) => `    <link rel="stylesheet" href="/${path.basename(f)}">`)
  .join('\n');
const jsScripts = jsFiles
  .map((f) => `    <script type="module" src="/${path.basename(f)}"></script>`)
  .join('\n');

const html = template
  .replace('    <script type="module" src="/src/main.tsx"></script>', `${cssLinks}\n${jsScripts}`);

fs.writeFileSync(path.join(outdir, 'index.html'), html, 'utf8');
console.log('Generated: dist/index.html');
console.log('Build complete.');
