import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import theme from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { usePlayerStore } from '../store/playerStore';
import { getImageUrl } from '../services/api';
import { formatTime } from '../utils/helpers';

export default function AlbumScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { album } = (route.params as any) || {};
  const [songs, setSongs] = useState<Song[]>(album?.songs || []);
  const { playSong, addMultipleToQueue } = usePlayerStore();

  const imageUrl = getImageUrl(album?.image || [], '500x500');

  const handlePlayAll = () => {
    if (!songs || songs.length === 0) return;
    playSong(songs[0], songs, 0);
    addMultipleToQueue(songs);
    navigation.navigate('Player' as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: imageUrl }} style={styles.artwork} />
        <Text style={styles.title}>{album?.name}</Text>
        <Text style={styles.subtitle}>{album?.artist || ''}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handlePlayAll}><Text style={styles.primaryText}>Shuffle</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}><Text style={styles.secondaryText}>Play</Text></TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={songs}
        keyExtractor={(it, idx) => `${it.id}-${idx}`}
        renderItem={({ item, index }) => {
          const image = getImageUrl(item.image, '300x300', item.id || item.name);
          const durationText = item.duration ? `${formatTime(item.duration)} mins` : '';
          return (
            <View style={styles.row}>
              <Image source={{ uri: image }} style={styles.rowImageLarge} />

              <View style={styles.rowInfoLeft}>
                <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1} ellipsizeMode="tail">{item.primaryArtists ? `${item.primaryArtists}  |  ${durationText}` : durationText}</Text>
              </View>

              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.playCircle} onPress={() => { playSong(item, songs, index); addMultipleToQueue(songs); navigation.navigate('Player' as never); }}>
                  <Ionicons name="play" size={18} color={theme.colors.background} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.moreButton} onPress={() => { /* options */ }}>
                  <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 50 },
  header: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  artwork: { width: 220, height: 220, borderRadius: theme.radii.lg, backgroundColor: theme.colors.surfaceMuted },
  title: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 12 },
  subtitle: { color: theme.colors.textSecondary, marginTop: 6 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  primaryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22 },
  primaryText: { color: theme.colors.background, fontWeight: '700' },
  secondaryButton: { backgroundColor: theme.colors.surfaceMuted, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  secondaryText: { color: theme.colors.textPrimary, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  rowImageLarge: { width: 72, height: 72, borderRadius: 12, backgroundColor: theme.colors.surfaceMuted, marginRight: 12 },
  rowImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: theme.colors.surfaceMuted },
  rowInfoLeft: { flex: 1 },
  rowInfo: { flex: 1, marginLeft: 12 },
  rowTitle: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 18 },
  rowSubtitle: { color: theme.colors.textSecondary, marginTop: 6, fontSize: 13 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  rowDuration: { color: theme.colors.textSecondary },
});