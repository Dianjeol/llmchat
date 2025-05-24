# LLM Chat

A cross-platform AI chat application built with React Native and Expo, supporting multiple platforms including web, mobile, and desktop.

## Features

- 🤖 Multi-LLM support (OpenRouter, DeepSeek, and more)
- 📱 Cross-platform (iOS, Android, Web, Linux Desktop)
- 💬 Real-time chat interface
- 📷 Image upload support
- 🔧 Customizable model selection
- 💾 Chat history with local storage

## Development

### Mobile & Web
```bash
# Install dependencies
npm install

# Start development server
npm start

# Platform-specific development
npm run android    # Android
npm run ios        # iOS
npm run web        # Web browser
```

### Desktop (Linux)
```bash
# Build web version first
npm run build-web

# Run in development mode
npm run electron-dev

# Build AppImage for Linux
npm run build-appimage

# Build all Linux formats (AppImage, DEB, RPM)
npm run build-electron
```

## Releases

Linux releases are automatically built and published to GitHub Releases when a new tag is pushed:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will trigger the GitHub Actions workflow to build:
- AppImage (portable)
- DEB package (Debian/Ubuntu)
- RPM package (RedHat/Fedora)

## Installation

### Linux Desktop
1. Download the latest release from [GitHub Releases](https://github.com/dianjeol/llmchat/releases)
2. For AppImage: Make executable and run
   ```bash
   chmod +x LLM-Chat-*.AppImage
   ./LLM-Chat-*.AppImage
   ```
3. For DEB: `sudo dpkg -i llmchat_*.deb`
4. For RPM: `sudo rpm -i llmchat-*.rpm`

### Mobile
Use Expo Go app and scan the QR code when running `npm start`

## License

0BSD - Free for any use
