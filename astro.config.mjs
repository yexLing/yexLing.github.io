// @ts-check
import { defineConfig } from 'astro/config';

// For a user/organization site (https://<username>.github.io) the site is the
// root, so `base` stays "/". If you later move this to a project repo
// (e.g. github.com/yexLing/blog), set base: '/blog'.
export default defineConfig({
  site: 'https://yexling.com',
  base: '/',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
