#!/usr/bin/env node
/**
 * Build the web app and push dist/ to the gh-pages branch for GitHub Pages.
 * Run from repo root: npm run deploy:pages
 */
import { copyFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'apps', 'web', 'dist');

// For GitHub project pages (username.github.io/REPO_NAME), set base so assets load correctly.
// Example: GITHUB_PAGES_REPO=GIG-find npm run deploy:pages
const repo = process.env.GITHUB_PAGES_REPO;
const basePath = repo ? `/${repo.replace(/^\/|\/$/g, '')}/` : '/';
const buildEnv = { ...process.env, VITE_BASE_PATH: basePath };

console.log('Building web app...' + (repo ? ` (base: ${basePath})` : ''));
execSync('npm run build:web', { cwd: root, stdio: 'inherit', env: buildEnv });

if (!existsSync(join(distDir, 'index.html'))) {
  console.error('Build failed or dist missing. Expected:', distDir);
  process.exit(1);
}

console.log('Preparing for GitHub Pages (SPA + no Jekyll)...');
copyFileSync(join(distDir, 'index.html'), join(distDir, '404.html'));
writeFileSync(join(distDir, '.nojekyll'), '');

const ghpages = require('gh-pages');
// Clear gh-pages cache so a fresh clone is used (avoids "branch already exists" in reused clone)
ghpages.clean();

console.log('Pushing to gh-pages branch...');
ghpages.publish(distDir, { dotfiles: true, force: true })
  .then(() => {
    console.log('Done. Enable GitHub Pages: repo → Settings → Pages → Source: gh-pages branch.');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
