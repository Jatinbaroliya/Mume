import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomSlider from '../components/CustomSlider';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { audioService } from '../services/audioService';
import { getImageUrl } from '../services/api';
import { getArtistName, formatTime } from '../utils/helpers';
import theme from '../theme';

const { width } = Dimensions.get('window');

export default function PlayerScreen() {
  const navigation = useNavigation();
  const {
    currentSong,
    playbackStatus,
    position,
    duration,
    isShuffled,
    repeatMode,
    nextSong,
    previousSong,
    toggleShuffle,
    setRepeatMode,
  } = usePlayerStore();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  useEffect(() => {
    if (currentSong && playbackStatus === 'loading') {
      const loadAndPlay = async () => {
        await audioService.loadSong(currentSong);
        if (shouldAutoPlay) {
          await audioService.play();
          setShouldAutoPlay(false);
        }
      };
      loadAndPlay();
    }
  }, [currentSong, playbackStatus, shouldAutoPlay]);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(position);
    }
  }, [position, isSeeking]);

  if (!currentSong) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No song selected</Text>
      </View>
    );
  }

  const imageUrl = getImageUrl(currentSong.image, '500x500', currentSong.id || currentSong.name);
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const formattedPosition = formatTime(position);
  const formattedDuration = formatTime(duration);

  const handlePlayPause = async () => {
    if (playbackStatus === 'playing') {
      await audioService.pause();
    } else if (playbackStatus === 'paused') {
      await audioService.play();
    }
  };

  const handleSeek = (value: number) => {
    setSeekValue(value);
    setIsSeeking(true);
  };

  const handleSeekComplete = async (value: number) => {
    setIsSeeking(false);
    await audioService.seekTo(value);
  };

  const handleNext = () => {
    const next = nextSong();
    if (next) {
      setShouldAutoPlay(true);
      // The useEffect will handle loading and playing when currentSong changes
    }
  };

  const handlePrevious = () => {
    const prev = previousSong();
    if (prev) {
      setShouldAutoPlay(true);
      // The useEffect will handle loading and playing when currentSong changes
    }
  };

  const cycleRepeatMode = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };



  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.albumArt}
        />

        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={2}>
            {currentSong.name}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {getArtistName(currentSong)}
          </Text>
          <Text style={styles.songAlbum} numberOfLines={1}>
            {currentSong.album.name}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <CustomSlider
            minimumValue={0}
            maximumValue={duration || 1}
            value={isSeeking ? seekValue : position}
            onValueChange={handleSeek}
            onSlidingComplete={handleSeekComplete}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.divider}
            thumbTintColor={theme.colors.primary}
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formattedPosition}</Text>
            <Text style={styles.timeText}>{formattedDuration}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isShuffled && styles.controlButtonActive]}
            onPress={toggleShuffle}
          >
            <Ionicons name="shuffle" size={20} color={isShuffled ? theme.colors.background : theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handlePrevious}
          >
            <Ionicons name="play-skip-back" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPause}
            disabled={playbackStatus === 'loading'}
          >
            {playbackStatus === 'loading' ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Ionicons name={playbackStatus === 'playing' ? 'pause' : 'play'} size={32} color={theme.colors.background} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNext}
          >
            <Ionicons name="play-skip-forward" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, repeatMode !== 'none' && styles.controlButtonActive]}
            onPress={cycleRepeatMode}
          >
            <Ionicons name={repeatMode === 'one' ? 'repeat' : 'repeat'} size={20} color={repeatMode !== 'none' ? theme.colors.background : theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 50,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  albumArt: {
    width: width - 80,
    height: width - 80,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surfaceMuted,
    marginBottom: 40,
  },
  songInfo: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  songTitle: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  songArtist: {
    color: theme.colors.textSecondary,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 4,
  },
  songAlbum: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 40,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  controlButtonText: {
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  controlButtonTextActive: {
    color: theme.colors.background,
  },

  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: theme.colors.textPrimary,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 32,
    color: theme.colors.background,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 18,
    textAlign: 'center',
  },
});

