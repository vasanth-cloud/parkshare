import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parkshare.customer',
  appName: 'ParkShare',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.17:5173',
    cleartext: true
  }
};

export default config;
