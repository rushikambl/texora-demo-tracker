import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const mock = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Built site goes to docs/ so GitHub Pages can serve it from main /docs.
// `vite build --mode e2e` swaps Firebase for an in-memory fake (tests/e2e) and builds to .e2e/.
export default defineConfig(({ mode }) => ({
  base: './',
  build: mode === 'e2e'
    ? { outDir: '.e2e', emptyOutDir: true }
    : { outDir: 'docs', emptyOutDir: true },
  resolve: mode === 'e2e'
    ? { alias: { 'firebase/app': mock('./tests/e2e/firebase-app.ts'), 'firebase/firestore': mock('./tests/e2e/firebase-firestore.ts') } }
    : {},
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
}));
