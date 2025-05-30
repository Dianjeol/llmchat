#!/bin/bash

# Test build script to verify everything works
echo "🔧 Testing local build process..."

# Clean previous builds
rm -rf dist/ electron-dist/

echo "📦 Building web version..."
npm run build-web

echo "🖥️ Building electron packages..."
npm run build-electron

echo "📁 Listing built files..."
ls -la electron-dist/

echo "✅ Build test completed!"
echo "Files created:"
find electron-dist/ -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" | head -10 