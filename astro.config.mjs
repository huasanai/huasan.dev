// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://huasan.dev',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
});
