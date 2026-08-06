import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: process.env.SITE_URL || 'https://housesmart.ca',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  security: {
    checkOrigin: true,
    // Required for Host-header validation: without this Astro rewrites every
    // request host to "localhost", which breaks the CSRF origin check and
    // 403s all form POSTs (signup/login/bookmarks/leads).
    allowedDomains: [
      { hostname: 'housesmart.ca' },
      { hostname: 'www.housesmart.ca' },
      { hostname: 'localhost' },
      { hostname: '127.0.0.1' },
    ],
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    host: true,
    port: 4321,
  },
});
