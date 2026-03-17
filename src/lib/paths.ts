import path from 'path';
import { repoRoot } from './git.js';

let _root: string | undefined;

function root(): string {
  if (!_root) {
    _root = repoRoot();
  }
  return _root;
}

export function pushbackDir(): string {
  return path.join(root(), '.pushback');
}

export function configPath(): string {
  return path.join(pushbackDir(), 'config.json');
}

export function receiptPath(): string {
  return path.join(pushbackDir(), 'verified');
}

export function gitHooksDir(): string {
  return path.join(root(), '.git', 'hooks');
}

export function prePushHook(): string {
  return path.join(gitHooksDir(), 'pre-push');
}

export function gitignorePath(): string {
  return path.join(root(), '.gitignore');
}
