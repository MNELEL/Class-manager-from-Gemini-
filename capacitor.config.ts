import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.classmanager.pro',
  appName: 'ClassManager Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
