import { Audio } from 'expo-av';
import { usePlayerStore } from '../store/playerStore';
import { getAudioUrl } from './api';
import { Song } from '../types';

class AudioService {
  private sound: Audio.Sound | null = null;
  private positionUpdateInterval: NodeJS.Timeout | null = null;

  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  async loadSong(song: Song) {
    try {
      // Stop and unload previous sound first
      if (this.sound) {
        try {
          await this.sound.stopAsync();
          await this.sound.unloadAsync();
        } catch (error) {
          console.warn('Error stopping previous song:', error);
        }
        this.sound = null;
      }

      // Stop position updates while loading
      this.stopPositionUpdates();

      const audioUrl = getAudioUrl(song.downloadUrl, '320kbps');
      if (!audioUrl) {
        throw new Error('No audio URL available');
      }

      usePlayerStore.getState().setPlaybackStatus('loading');
      usePlayerStore.getState().setPosition(0);
      usePlayerStore.getState().setDuration(0);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      usePlayerStore.getState().setPlaybackStatus('paused');
      
      // Start position updates
      this.startPositionUpdates();
    } catch (error) {
      console.error('Error loading song:', error);
      usePlayerStore.getState().setPlaybackStatus('error');
    }
  }

  async play() {
    if (this.sound) {
      await this.sound.playAsync();
      usePlayerStore.getState().setPlaybackStatus('playing');
    }
  }

  async pause() {
    if (this.sound) {
      await this.sound.pauseAsync();
      usePlayerStore.getState().setPlaybackStatus('paused');
    }
  }

  async stop() {
    if (this.sound) {
      await this.sound.stopAsync();
      usePlayerStore.getState().setPlaybackStatus('idle');
      usePlayerStore.getState().setPosition(0);
    }
  }

  async seekTo(positionMillis: number) {
    if (this.sound) {
      await this.sound.setPositionAsync(positionMillis);
      usePlayerStore.getState().setPosition(positionMillis);
    }
  }

  async setVolume(volume: number) {
    if (this.sound) {
      await this.sound.setVolumeAsync(volume);
    }
  }

  private onPlaybackStatusUpdate(status: any) {
    if (status.isLoaded) {
      usePlayerStore.getState().setDuration(status.durationMillis || 0);
      
      if (status.didJustFinish) {
        this.handlePlaybackFinish();
      }
    }
  }

  private startPositionUpdates() {
    this.stopPositionUpdates();
    this.positionUpdateInterval = setInterval(async () => {
      if (this.sound) {
        try {
          const status = await this.sound.getStatusAsync();
          if (status.isLoaded && status.positionMillis !== undefined) {
            usePlayerStore.getState().setPosition(status.positionMillis);
          }
        } catch (error) {
          console.error('Error getting position:', error);
        }
      }
    }, 500);
  }

  private stopPositionUpdates() {
    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }
  }

  private async handlePlaybackFinish() {
    const state = usePlayerStore.getState();
    const { repeatMode, nextSong } = state;
    
    if (repeatMode === 'one') {
      await this.seekTo(0);
      await this.play();
    } else {
      const next = nextSong(); // This now updates currentSong in the store
      if (next) {
        // The PlayerScreen useEffect will handle loading and playing
        // But we need to load it here since we're in the audio service
        await this.loadSong(next);
        await this.play();
      } else {
        await this.stop();
      }
    }
  }

  async cleanup() {
    this.stopPositionUpdates();
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

export const audioService = new AudioService();

