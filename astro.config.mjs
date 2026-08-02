// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://remontstarterov.by',
  vite: {
    plugins: [tailwindcss()],
    server: { allowedHosts: ['.loca.lt'] }
  },

  integrations: [sitemap({
    filter: (page) => !page.includes('/design-')
  })]
});