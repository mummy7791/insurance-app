$ErrorActionPreference = "Stop"

Write-Host "Installing Capacitor 8 for SecureLife..." -ForegroundColor Green
npm install @capacitor/core@8 @capacitor/android@8 @capacitor/ios@8
npm install --save-dev @capacitor/cli@8

npm run build

if (-not (Test-Path "android")) {
  npx cap add android
}
if (-not (Test-Path "ios")) {
  npx cap add ios
}

npx cap sync
Write-Host "SecureLife Android + iOS projects are ready." -ForegroundColor Green
Write-Host "Android: npx cap open android"
Write-Host "iPhone (Mac required): npx cap open ios"
