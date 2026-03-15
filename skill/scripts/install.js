#!/usr/bin/env node
// Pushback — lightweight hook installer
// Installs the git pre-push shim if .pushback/hooks/pre-push.js exists.
// Designed to run from a package.json "prepare" script so that every
// developer gets the hook automatically after `npm install`.
// Fast, silent on success, idempotent.
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Only run if we're in a git repo with Pushback set up
let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
} catch {
  // Not a git repo (e.g. installing from npm tarball) — skip silently
  process.exit(0);
}

const hookLogic = path.join(repoRoot, '.pushback', 'hooks', 'pre-push.js');
if (!fs.existsSync(hookLogic)) {
  // Pushback not set up in this project — skip silently
  process.exit(0);
}

const gitHooksDir = path.join(repoRoot, '.git', 'hooks');
const prePushHook = path.join(gitHooksDir, 'pre-push');

// Already installed?
if (fs.existsSync(prePushHook)) {
  const existing = fs.readFileSync(prePushHook, 'utf8');
  if (existing.includes('.pushback')) {
    // Our shim is already in place — done
    process.exit(0);
  }
  // Someone else's hook — back it up
  const previousPath = prePushHook + '.previous';
  if (!fs.existsSync(previousPath)) {
    fs.renameSync(prePushHook, previousPath);
  }
}

// Write the shim
fs.mkdirSync(gitHooksDir, { recursive: true });

const shimContent = `#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const path = require('path');
const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
require(path.join(root, '.pushback', 'hooks', 'pre-push.js'));
`;

fs.writeFileSync(prePushHook, shimContent);
try {
  fs.chmodSync(prePushHook, 0o755);
} catch {
  // chmod may not work on Windows — that's ok, Git Bash uses the shebang
}

console.log('Pushback: pre-push hook installed.');
