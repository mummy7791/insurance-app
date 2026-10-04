#!/usr/bin/env bash
set -euo pipefail

echo "Installing Capacitor 8 for SecureLife..."
npm install @capacitor/core@8 @capacitor/android@8 @capacitor/ios@8
npm install --save-dev @capacitor/cli@8
npm run build

[ -d android ] || npx cap add android
[ -d ios ] || npx cap add ios
npx cap sync

echo "SecureLife Android + iOS projects are ready."
echo "Android: npx cap open android"
echo "iPhone (Mac required): npx cap open ios"
