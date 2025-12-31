import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../store/playerStore';
import { audioService } from '../services/audioService';
import { getImageUrl } from '../services/api';
import { getArtistName } from '../utils/helpers';
import theme from '../theme';

export default function MiniPlayer() {
  const navigation = useNavigation();
  const { currentSong, playbackStatus, position, duration } = usePlayerStore();

  useEffect(() => {
    if (currentSong && playbackStatus === 'loading') {
      audioService.loadSong(currentSong);
    }
  }, [currentSong, playbackStatus]);

  if (!currentSong) {
    return null;
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const imageUrl = getImageUrl(currentSong.image, '150x150', currentSong.id || currentSong.name);

  const handlePress = () => {
    navigation.navigate('Player' as never);
  };

  const handlePlayPause = async () => {
    if (playbackStatus === 'playing') {
      await audioService.pause();
    } else if (playbackStatus === 'paused') {
      await audioService.play();
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.9}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      
      <View style={styles.content}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.thumbnail}
        />
        
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.name}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {getArtistName(currentSong)}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.playButton}
          onPress={(e) => {
            e.stopPropagation();
            handlePlayPause();
          }}
        >
          <Ionicons name={playbackStatus === 'playing' ? 'pause' : 'play'} size={18} color={theme.colors.background} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1000,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.divider,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: theme.colors.background,
    fontSize: 16,
  },
});

