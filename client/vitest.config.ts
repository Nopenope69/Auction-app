import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts - see the comment there. No
// plugins needed: every test so far (useAuctionDerived.test.ts) is a plain
// TypeScript pure-function test, no JSX or CSS involved.
export default defineConfig({
  test: {
    environment: 'node',
  },
});
