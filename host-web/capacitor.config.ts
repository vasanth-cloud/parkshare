import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parkshare.host',
  appName: 'ParkCo Partner',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.17:5174',
    cleartext: true
  }
};

export default config;
