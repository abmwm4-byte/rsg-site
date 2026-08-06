// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://remontstarterov.by',
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
    server: { allowedHosts: ['.loca.lt'] }
  },

  integrations: [sitemap()]
});