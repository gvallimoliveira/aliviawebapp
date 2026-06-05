import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9a266497f7cd449681f684dc1ea4edfb',
  appName: 'aliviawebapp',
  webDir: 'dist',
  server: {
    url: 'https://9a266497-f7cd-4496-81f6-84dc1ea4edfb.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
