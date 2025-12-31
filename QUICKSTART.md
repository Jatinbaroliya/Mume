# Quick Start Guide

## Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the Expo development server:**
   ```bash
   npm start
   ```

3. **Run on your device:**
   - Press `a` for Android emulator
   - Press `i` for iOS simulator  
   - Scan QR code with Expo Go app on physical device

## First Run

1. Open the app
2. Use the search bar on the Home screen to search for songs (e.g., "arijit")
3. Tap any song to start playing
4. The Mini Player will appear at the bottom
5. Tap the Mini Player to open the Full Player screen
6. Navigate to the Queue tab to manage your playlist

## Features to Test

### Core Features
- ✅ Search songs with pagination (scroll to load more)
- ✅ Play/pause controls
- ✅ Seek bar for scrubbing through songs
- ✅ Mini Player syncs with Full Player
- ✅ Queue management (add, reorder, remove)

### Bonus Features
- ✅ Shuffle mode (tap shuffle button in player)
- ✅ Repeat modes (tap repeat button to cycle: None → All → One)
- ✅ Background playback (minimize app, music continues)
- ✅ Queue persistence (queue saved across app restarts)

## Troubleshooting

### Audio not playing?
- Check internet connection (songs stream from API)
- Ensure device volume is up
- Try a different song

### TypeScript errors?
- Run `npm install` to ensure all dependencies are installed
- Restart the TypeScript server in your IDE

### Build errors?
- Clear cache: `expo start -c`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## API Endpoints Used

- `GET /api/search/songs?query={query}&page={page}` - Search songs
- `GET /api/songs/{id}` - Get song details
- Base URL: `https://saavn.sumit.co/`

## Notes

- The app uses real API data (no mocks)
- Queue and settings persist using MMKV storage
- Background playback works on both iOS and Android
- Custom slider component for better Expo compatibility

