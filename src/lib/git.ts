import { execSync } from 'child_process';

export function git(cmd: string): string {
  return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
}

export function gitOrNull(cmd: string): string | null {
  try {
    return git(cmd);
  } catch {
    return null;
  }
}

/** Raw execSync for diff — don't trim, hash must match exact output */
export function gitDiff(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8' });
  } catch {
    return '';
  }
}

export function repoRoot(): string {
  return git('rev-parse --show-toplevel');
}
