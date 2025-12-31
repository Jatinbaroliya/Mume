import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../store/playerStore';
import { audioService } from '../services/audioService';
import { getImageUrl } from '../services/api';
import { Song } from '../types';
import { getArtistName } from '../utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme';

export default function QueueScreen() {
  const navigation = useNavigation();
  const {
    queue,
    currentIndex,
    currentSong,
    removeFromQueue,
    reorderQueue,
    playSong,
  } = usePlayerStore();

  const handlePlaySong = async (song: Song, index: number) => {
    playSong(song, queue, index);
    await audioService.loadSong(song);
    await audioService.play();
    navigation.navigate('Player' as never);
  };

  const handleRemove = (index: number) => {
    removeFromQueue(index);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderQueue(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < queue.length - 1) {
      reorderQueue(index, index + 1);
    }
  };

  const renderQueueItem = ({ item, index }: { item: Song; index: number }) => {
    const imageUrl = getImageUrl(item.image, '300x300', item.id || item.name);
    const isCurrent = index === currentIndex;
    const artistName = getArtistName(item);
    const durationText = item.duration ? `${formatTime(item.duration)} mins` : '';

    return (
      <View style={[styles.queueItem, isCurrent && styles.currentItem]}>
        <Image source={{ uri: imageUrl }} style={styles.songImageLarge} />

        <View style={styles.songInfoLeft}>
          <Text style={[styles.songTitle, isCurrent && styles.currentTitle]} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={styles.songSubtitle} numberOfLines={1} ellipsizeMode="tail">{artistName ? `${artistName}  |  ${durationText}` : durationText}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.playCircle} onPress={() => handlePlaySong(item, index)}>
            <Ionicons name="play" size={18} color={theme.colors.background} />
          </TouchableOpacity>

          {index > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleMoveUp(index)}
            >
              <Text style={styles.actionButtonText}>↑</Text>
            </TouchableOpacity>
          )}
          {index < queue.length - 1 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleMoveDown(index)}
            >
              <Text style={styles.actionButtonText}>↓</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemove(index)}
          >
            <Ionicons name="close" size={16} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (queue.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Queue</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your queue is empty</Text>
          <Text style={styles.emptySubtext}>
            Add songs from the Home screen to build your queue
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Queue</Text>
        <Text style={styles.queueCount}>{queue.length} songs</Text>
      </View>

      <FlatList
        data={queue}
        renderItem={renderQueueItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  queueCount: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 100,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  currentItem: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  songContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
  },
  songImageLarge: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  songInfoLeft: {
    flex: 1,
  },
  songSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  songTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  currentTitle: {
    color: theme.colors.primary,
  },
  songArtist: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});

