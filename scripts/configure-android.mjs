import fs from 'fs';
import path from 'path';

const root = process.cwd();
const androidDir = path.join(root, 'android');

if (!fs.existsSync(androidDir)) {
  console.error('[AETHER] android/ folder not found. Run `npx cap add android` first.');
  process.exit(1);
}

// 1. Update android/variables.gradle — Health Connect 1.1.0 stable requires compileSdk 36 + minSdk 26
const varsPath = path.join(androidDir, 'variables.gradle');
if (fs.existsSync(varsPath)) {
  let vars = fs.readFileSync(varsPath, 'utf8');
  vars = vars.replace(/minSdkVersion\s*=\s*\d+/, 'minSdkVersion = 26');
  vars = vars.replace(/compileSdkVersion\s*=\s*\d+/, 'compileSdkVersion = 36');
  vars = vars.replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 35');
  fs.writeFileSync(varsPath, vars, 'utf8');
  console.log('[AETHER] Updated variables.gradle (minSdk 26, compileSdk 36, targetSdk 35).');
}

// 2. Upgrade Android Gradle Plugin to 8.9.1 (required by Health Connect 1.1.0) & add Kotlin 2.1.0
const rootGradlePath = path.join(androidDir, 'build.gradle');
let rootGradle = fs.readFileSync(rootGradlePath, 'utf8');
rootGradle = rootGradle.replace(
  /com\.android\.tools\.build:gradle:[0-9.]+/,
  'com.android.tools.build:gradle:8.9.1'
);
if (!rootGradle.includes('kotlin-gradle-plugin')) {
  rootGradle = rootGradle.replace(
    /dependencies\s*\{/,
    `dependencies {\n        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.0"`
  );
}
fs.writeFileSync(rootGradlePath, rootGradle, 'utf8');
console.log('[AETHER] Updated android/build.gradle (AGP 8.9.1 + Kotlin 2.1.0).');

// 3. Apply kotlin-android plugin + Health Connect 1.1.0 (Stable Android 14/15/16 Framework SDK)
const appGradlePath = path.join(androidDir, 'app', 'build.gradle');
let appGradle = fs.readFileSync(appGradlePath, 'utf8');
if (!appGradle.includes('kotlin-android')) {
  appGradle = appGradle.replace(
    /apply plugin:\s*'com\.android\.application'/,
    `apply plugin: 'com.android.application'\napply plugin: 'kotlin-android'`
  );
}
if (!appGradle.includes('kotlinOptions')) {
  appGradle = appGradle.replace(
    /android\s*\{/,
    `android {\n    kotlinOptions {\n        jvmTarget = '21'\n    }`
  );
}
if (!appGradle.includes('androidx.health.connect:connect-client')) {
  appGradle = appGradle.replace(
    /dependencies\s*\{/,
    `dependencies {\n    implementation "androidx.health.connect:connect-client:1.1.0"\n    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0"`
  );
}
fs.writeFileSync(appGradlePath, appGradle, 'utf8');
console.log('[AETHER] Configured android/app/build.gradle (Health Connect 1.1.0 Stable).');

// 4. Copy HealthConnectPlugin.kt into package folder
const pluginDir = path.join(androidDir, 'app', 'src', 'main', 'java', 'com', 'aetheros', 'biometrics', 'plugins');
fs.mkdirSync(pluginDir, { recursive: true });
fs.copyFileSync(
  path.join(root, 'android-native', 'HealthConnectPlugin.kt'),
  path.join(pluginDir, 'HealthConnectPlugin.kt')
);
console.log('[AETHER] Copied HealthConnectPlugin.kt.');

// 5. Register HealthConnectPlugin in MainActivity.java
const mainActivityPath = path.join(androidDir, 'app', 'src', 'main', 'java', 'com', 'aetheros', 'biometrics', 'MainActivity.java');
const mainActivityContent = `package com.aetheros.biometrics;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.aetheros.biometrics.plugins.HealthConnectPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`;
fs.writeFileSync(mainActivityPath, mainActivityContent, 'utf8');
console.log('[AETHER] Patched MainActivity.java.');

// 6. Merge Health Connect permissions & Android 14+ rationale alias into AndroidManifest.xml
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');

const permissionsBlock = `
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.health.READ_HEART_RATE" />
    <uses-permission android:name="android.permission.health.READ_RESTING_HEART_RATE" />
    <uses-permission android:name="android.permission.health.READ_HEART_RATE_VARIABILITY" />
    <uses-permission android:name="android.permission.health.READ_SLEEP" />
    <uses-permission android:name="android.permission.health.READ_EXERCISE" />
    <uses-permission android:name="android.permission.health.READ_OXYGEN_SATURATION" />
    <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <queries>
        <package android:name="com.google.android.apps.healthdata" />
    </queries>
`;

if (!manifest.includes('READ_RESTING_HEART_RATE')) {
  manifest = manifest.replace('</manifest>', `${permissionsBlock}\n</manifest>`);
}

const rationaleBlock = `
        <activity-alias
            android:name="ViewPermissionUsageActivity"
            android:exported="true"
            android:targetActivity=".MainActivity"
            android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
            </intent-filter>
        </activity-alias>
`;

if (!manifest.includes('VIEW_PERMISSION_USAGE')) {
  manifest = manifest.replace(
    '</activity>',
    `            <intent-filter>
                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
            </intent-filter>
        </activity>
${rationaleBlock}`
  );
}
fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log('[AETHER] Updated AndroidManifest.xml with Android 14/15/16 Health Connect permissions.');

// 7. Install AETHER custom launcher icons
const resDir = path.join(androidDir, 'app', 'src', 'main', 'res');
const icon512 = path.join(root, 'public', 'icons', 'aether-512.png');
const icon192 = path.join(root, 'public', 'icons', 'aether-192.png');
const mipmapFolders = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];

for (const folder of mipmapFolders) {
  const targetDir = path.join(resDir, folder);
  if (fs.existsSync(targetDir)) {
    const src = folder === 'mipmap-mdpi' || folder === 'mipmap-hdpi' ? icon192 : icon512;
    fs.copyFileSync(src, path.join(targetDir, 'ic_launcher.png'));
    fs.copyFileSync(src, path.join(targetDir, 'ic_launcher_round.png'));
    fs.copyFileSync(src, path.join(targetDir, 'ic_launcher_foreground.png'));
  }
}
const anydpi = path.join(resDir, 'mipmap-anydpi-v26');
if (fs.existsSync(anydpi)) {
  fs.rmSync(anydpi, { recursive: true, force: true });
}
console.log('[AETHER] Installed custom AETHER launcher icons.');
