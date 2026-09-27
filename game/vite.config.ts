import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
  // 版本号只在 package.json 里改，“关于”页读这里
  define: { __APP_VERSION__: JSON.stringify(version) },
});
