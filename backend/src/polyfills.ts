// Polyfill for crypto module to fix NestJS scheduler issue
import { webcrypto } from 'node:crypto';

// Ensure crypto is available globally for @nestjs/schedule
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

// Alternative approach for older Node.js versions
if (typeof crypto === 'undefined') {
  const nodeCrypto = require('crypto');
  (global as any).crypto = {
    getRandomValues: (arr: any) => nodeCrypto.randomFillSync(arr),
    randomUUID: () => nodeCrypto.randomUUID(),
  };
} 