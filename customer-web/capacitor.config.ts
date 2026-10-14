import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parkshare.customer',
  appName: 'ParkCo',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
