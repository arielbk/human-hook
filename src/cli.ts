import { check } from './commands/check.js';
import { setup } from './commands/setup.js';
import { install } from './commands/install.js';

const command = process.argv[2];

switch (command) {
  case 'check':
    check();
    break;
  case 'setup':
    setup();
    break;
  case 'install':
    install();
    break;
  default:
    console.log(`pushback — gate git push with conversational verification

Usage:
  pushback check     Run the pre-push verification check
  pushback setup     Set up Pushback in the current repository
  pushback install   Install the git hook shim (lightweight, for prepare scripts)`);
    process.exit(command ? 1 : 0);
}
