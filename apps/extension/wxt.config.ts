import { defineConfig } from 'wxt';
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AI Search Companion',
    description: 'A user-controlled, third-party AI answer card for Google Search.',
    permissions: ['storage'],
    host_permissions: ['https://www.google.com/search*']
  }
});

