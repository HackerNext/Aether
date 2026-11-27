import type { CapacitorConfig } from '@capacitor/cli';

// adjustMarginsForEdgeToEdge: 'force' prevents Android 15/16 system status bar
// and gesture navigation bar from overlapping app headers, buttons, or bottom nav.
const config: CapacitorConfig = {
  appId: 'com.aetheros.biometrics',
  appName: 'AETHER',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#07090D',
    adjustMarginsForEdgeToEdge: 'force',
  },
  plugins: {
    HealthConnect: {
      enabled: true,
    },
  },
};

export default config;
