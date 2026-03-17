import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { gitOrNull, gitDiff } from '../lib/git.js';
import { loadConfig } from '../lib/config.js';
import { receiptPath, gitHooksDir } from '../lib/paths.js';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function chainAndExit(): never {
  const hooksDir = gitHooksDir();
  const previous = path.join(hooksDir, 'pre-push.previous');

  if (existsSync(previous)) {
    try {
      execSync(previous, {
        stdio: 'inherit',
        argv0: previous,
      });
    } catch (err: any) {
      process.exit(err.status || 1);
    }
  }

  process.exit(0);
}

export function check(): void {
  const config = loadConfig();

  // Check override env var
  if (process.env[config.override_env_var]) {
    chainAndExit();
  }

  // Compute outgoing diff hash
  let diff: string;
  if (gitOrNull('rev-parse @{upstream}') !== null) {
    diff = gitDiff('diff @{upstream}..HEAD');
  } else {
    // Detect default branch for new branches with no upstream
    let defaultBranch = 'main';
    const remoteInfo = gitOrNull('remote show origin');
    if (remoteInfo) {
      const match = remoteInfo.match(/HEAD branch:\s*(\S+)/);
      if (match) defaultBranch = match[1];
    }
    diff = gitDiff(`diff ${defaultBranch}..HEAD`);
  }

  // Nothing to push — allow
  if (!diff) {
    chainAndExit();
  }

  const currentHash = sha256(diff);

  // Compare against receipt
  const receipt = receiptPath();
  if (existsSync(receipt)) {
    const storedHash = readFileSync(receipt, 'utf8').trim();
    if (currentHash === storedHash) {
      chainAndExit();
    }
  }

  // Block
  process.stderr.write(`
Pushback: verification required before pushing.

This push was blocked because the developer hasn't verified their
understanding of the outgoing changes yet.

To proceed, run the Pushback skill — it will walk through the diff,
ask 2-3 questions about the changes, and write a verification receipt
if the developer demonstrates understanding. The push will succeed
on retry once the receipt is in place.

  If you're the developer: ask your AI agent to run Pushback, or
  invoke it directly in your editor's chat.

  If you're an AI agent: invoke the "pushback" skill now. Do not
  attempt to bypass verification, skip the hook, or write the
  receipt directly — the developer must go through the conversation.

`);

  process.exit(1);
}
