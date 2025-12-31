# Music Player App

A React Native music streaming app built with Expo, TypeScript, and Zustand. This app allows users to search and play music from the JioSaavn API with features like queue management, background playback, shuffle, and repeat modes.

## Features

### Core Features
- **Home Screen**: Search songs with pagination support
- **Full Player**: Complete playback controls with seek bar
- **Mini Player**: Persistent player bar that syncs with full player
- **Queue Management**: Add, reorder, and remove songs from queue
- **Background Playback**: Music continues playing when app is minimized
- **State Synchronization**: Perfect sync between mini and full player

### Bonus Features
- **Shuffle Mode**: Randomize song playback
- **Repeat Modes**: None, All, and One song repeat
- **Local Persistence**: Queue and settings saved using MMKV
- **Offline Queue**: Queue persists across app restarts

## Tech Stack

- **React Native** (Expo ~50.0.0)
- **TypeScript**
- **React Navigation v6** (Native Stack & Bottom Tabs)
- **Zustand** (State Management)
- **MMKV** (Local Storage)
- **Expo AV** (Audio Playback)
- **Axios** (API Calls)

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android) or Xcode (for iOS)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Mume
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your device:
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Scan QR code with Expo Go app on your physical device

## Project Structure

```
music-player-app/
├── src/
│   ├── components/          # Reusable components
│   │   ├── MiniPlayer.tsx
│   │   └── CustomSlider.tsx
│   ├── navigation/          # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── screens/             # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── PlayerScreen.tsx
│   │   └── QueueScreen.tsx
│   ├── services/            # API and audio services
│   │   ├── api.ts
│   │   └── audioService.ts
│   ├── store/               # Zustand stores
│   │   └── playerStore.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   └── utils/               # Utility functions
│       └── storage.ts
├── App.tsx                   # App entry point
├── package.json
└── README.md
```

## Architecture

### State Management
The app uses **Zustand** for state management with persistence middleware. The player store manages:
- Current song and playback status
- Queue and current index
- Shuffle and repeat modes
- Playback position and duration

### Audio Service
A singleton `AudioService` class handles all audio operations:
- Loading and playing songs
- Seeking and volume control
- Background playback configuration
- Position updates and playback status

### API Integration
The app integrates with the JioSaavn API (`https://saavn.sumit.co/`):
- Search songs, albums, and artists
- Fetch song details and suggestions
- Get artist information and discography

### Navigation
- **Bottom Tabs**: Home and Queue screens
- **Stack Navigator**: Full player modal
- **Mini Player**: Overlay component on all screens

## Key Implementation Details

### Background Playback
Configured using Expo AV's `setAudioModeAsync` with:
- `staysActiveInBackground: true`
- `playsInSilentModeIOS: true`
- `shouldDuckAndroid: true`

### State Synchronization
Mini Player and Full Player share the same Zustand store, ensuring:
- Real-time position updates
- Synchronized playback status
- Consistent queue state

### Queue Management
- Songs can be added from search results
- Drag-to-reorder functionality (via up/down buttons)
- Remove songs individually
- Queue persists using MMKV storage

## Trade-offs

1. **Custom Slider**: Implemented a custom slider component instead of using `@react-native-community/slider` for better Expo compatibility and customization.

2. **MMKV over AsyncStorage**: Chosen for better performance and synchronous operations, especially for queue persistence.

3. **Zustand over Redux**: Simpler API, less boilerplate, and built-in persistence support.

4. **Expo AV**: Used instead of `react-native-track-player` for simplicity and Expo compatibility, though it has limitations for advanced background playback features.

## Building APK

To build an APK for Android:

```bash
expo build:android
```

Or use EAS Build:
```bash
eas build --platform android
```

## Demo Video

[Link to demo video - 2-3 minutes showcasing all features]

## API Documentation

The app uses the JioSaavn API. Full documentation available at:
https://saavn.sumit.co/docs

## License

This project is created for educational purposes as part of a React Native intern assignment.

