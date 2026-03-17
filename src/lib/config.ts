import { existsSync, readFileSync } from 'fs';
import { configPath } from './paths.js';

export interface PushbackConfig {
  triggers: string[];
  trivial_threshold: {
    max_lines: number;
    ignore_patterns: string[];
  };
  override_env_var: string;
}

export const DEFAULT_CONFIG: PushbackConfig = {
  triggers: ['push'],
  trivial_threshold: {
    max_lines: 5,
    ignore_patterns: [
      '*.lock',
      '*.lockb',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '*.generated.*',
    ],
  },
  override_env_var: 'PUSHBACK_OVERRIDE',
};

export function loadConfig(): PushbackConfig {
  const cfgPath = configPath();
  if (!existsSync(cfgPath)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = JSON.parse(readFileSync(cfgPath, 'utf8'));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
