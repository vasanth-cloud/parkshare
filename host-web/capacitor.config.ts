import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parkshare.host',
  appName: 'ParkCo Partner',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
