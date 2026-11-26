import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aetheros.biometrics',
  appName: 'AETHER',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#07090D',
  },
  plugins: {
    HealthConnect: {
      enabled: true,
    },
  },
};

export default config;
