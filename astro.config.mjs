// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

import { satteri } from '@astrojs/markdown-satteri';

// Lazy-загрузка для изображений в markdown-кейсах
const lazyImages = {
  name: 'lazy-images',
  element: {
    filter: ['img'],
    visit(node, ctx) {
      ctx.setProperty(node, 'loading', 'lazy');
      ctx.setProperty(node, 'decoding', 'async');
    }
  }
};

// https://astro.build/config
export default defineConfig({
  site: 'https://remontstarterov.by',
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
    server: { allowedHosts: ['.loca.lt'] }
  },

  markdown: {
    processor: satteri({ hastPlugins: [lazyImages] })
  },

  integrations: [sitemap()]
});