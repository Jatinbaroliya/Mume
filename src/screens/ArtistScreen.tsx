import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import theme from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { getArtistById, getArtistSongs, getImageUrl, searchArtists, searchSongs } from '../services/api';
import { formatTime } from '../utils/helpers';
import { usePlayerStore } from '../store/playerStore';
import { Song } from '../types';

export default function ArtistScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { artistId, artistName } = (route.params as any) || {};
  const [loading, setLoading] = useState(false);
  const [artist, setArtist] = useState<any>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSongs, setTotalSongs] = useState<number | null>(null);

  const { playSong, addMultipleToQueue } = usePlayerStore();

  useEffect(() => {
    if (artistId) {
      fetchArtist(1);
    }
  }, [artistId]);

  async function fetchArtist(pageNum: number = 1, append: boolean = false) {
    if (!artistId && !artistName) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    // helper to normalize various API response shapes into Song[]
    const extractSongs = (resp: any): Song[] => {
      if (!resp) return [];
      if (Array.isArray(resp)) return resp as Song[];
      if (Array.isArray(resp.data)) return resp.data as Song[];
      if (Array.isArray(resp.data?.results)) return resp.data.results as Song[];
      if (Array.isArray(resp.results)) return resp.results as Song[];
      if (Array.isArray(resp.data?.data)) return resp.data.data as Song[];
      if (Array.isArray(resp.songs)) return resp.songs as Song[];
      return [];
    };

    try {
      let resolvedArtistId = artistId;

      // If we don't have an artist id, attempt to search by artist name and use first match
      if (!resolvedArtistId && artistName) {
        try {
          const searchResp = await searchArtists(artistName, 1);
          if (searchResp?.data?.results && Array.isArray(searchResp.data.results) && searchResp.data.results.length > 0) {
            resolvedArtistId = searchResp.data.results[0].id;
          } else if (searchResp?.results && Array.isArray(searchResp.results) && searchResp.results.length > 0) {
            resolvedArtistId = searchResp.results[0].id;
          } else if (Array.isArray(searchResp) && searchResp.length > 0 && searchResp[0].id) {
            resolvedArtistId = searchResp[0].id;
          }
        } catch (e) {
          console.warn('Artist search fallback failed:', e);
        }
      }

      // Fetch artist metadata (if id exists) and songs (by id or by name)
      let artistMeta: any = null;
      let songsResp: any = null;

      if (resolvedArtistId) {
        const [a, sResp] = await Promise.all([getArtistById(resolvedArtistId), getArtistSongs(resolvedArtistId, pageNum)]);
        artistMeta = a?.data || a;
        songsResp = sResp;
      } else {
        // As a last resort, search songs by artist name and filter those that match the name heuristically
        try {
          const s = await searchSongs(artistName || '', pageNum);
          songsResp = s;
        } catch (e) {
          console.warn('Fallback searchSongs by artist name failed:', e);
        }
      }

      // Normalize and filter songs
      let rawSongs = extractSongs(songsResp);

      // Try to extract total from API responses (common shapes)
      const extractTotal = (resp: any): number | null => {
        if (!resp) return null;
        if (typeof resp.total === 'number') return resp.total;
        if (typeof resp.data?.total === 'number') return resp.data.total;
        if (typeof resp.data?.results?.total === 'number') return resp.data.results.total;
        if (typeof resp.data?.totalCount === 'number') return resp.data.totalCount;
        if (typeof resp.totalCount === 'number') return resp.totalCount;
        return null;
      };

      const apiTotal = extractTotal(songsResp);

      // If no rawSongs found yet, try broader search strategies
      if ((!rawSongs || rawSongs.length === 0) && artistName) {
        const queries = [artistName, `${artistName} songs`, (artistName.split(' ')[0] || artistName)];
        for (const q of queries) {
          try {
            const r = await searchSongs(q, pageNum);
            const hits = extractSongs(r);
            if (hits && hits.length > 0) {
              // prefer those that list the artist explicitly
              const byArtist = hits.filter(song => {
                const pa = (song.primaryArtists || '').toLowerCase();
                const artistsList = (song.artists?.primary || []).map((a: any) => a.name.toLowerCase()).join(', ');
                const nameLower = artistName.toLowerCase();
                return (pa && pa.includes(nameLower)) || (artistsList && artistsList.includes(nameLower));
              });

              rawSongs = byArtist.length > 0 ? byArtist : hits;
              // if this search response contains a total, use it
              const t = extractTotal(r);
              if (t !== null && apiTotal === null) {
                // use the first available API total
                apiTotal = t;
              }

              break;
            }
          } catch (e) {
            // ignore and continue
          }
        }
      }

      // Deduplicate by id when possible
      const unique = new Map<string, Song>();
      (rawSongs || []).forEach((s: any) => {
        const key = s?.id ? String(s.id) : `${s.name}-${s.album?.id ?? s.album?.name ?? Math.random()}`;
        if (!unique.has(key)) unique.set(key, s);
      });

      const filtered = Array.from(unique.values());

      if (append) {
        setSongs(prev => {
          const combined = [...prev, ...filtered];
          const map = new Map<string, Song>();
          combined.forEach(item => map.set(item.id ? String(item.id) : `${item.name}-${Math.random()}`, item));
          return Array.from(map.values());
        });
        // update totals when appending
        setTotalSongs(prev => (typeof apiTotal === 'number' ? apiTotal : ((prev ?? 0) + filtered.length)));
      } else {
        setSongs(filtered);
        setTotalSongs(typeof apiTotal === 'number' ? apiTotal : filtered.length);
      }

      setArtist(prev => prev || artistMeta);
      setHasMore(filtered.length > 0);
      setPage(pageNum);

      if ((filtered.length === 0)) {
        console.warn('No songs found for artist', { artistName, resolvedArtistId, rawCount: (rawSongs || []).length });
      }
    } catch (err) {
      console.warn('Artist fetch error', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  const handlePlayAll = async () => {
    if (songs.length === 0) return;
    playSong(songs[0], songs, 0);
    addMultipleToQueue(songs);
    navigation.navigate('Player' as never);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    fetchArtist(next, true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchArtist(1, false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const headerImage = artist?.image || songs[0]?.image || [];
  const imageUrl = getImageUrl(headerImage, '500x500');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: imageUrl }} style={styles.artwork} />
        <Text style={styles.title}>{artistName || artist?.name}</Text>
        <Text style={styles.subtitle}>{totalSongs !== null ? `${totalSongs} Songs` : `${songs.length} Songs`}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handlePlayAll}><Text style={styles.primaryText}>Play</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}><Text style={styles.secondaryText}>Shuffle</Text></TouchableOpacity>
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
                <Text style={styles.rowSubtitle} numberOfLines={1} ellipsizeMode="tail">{item.album?.name ? `${item.album.name}  |  ${durationText}` : durationText}</Text>
              </View>

              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.playCircle} onPress={() => { playSong(item, songs, index); addMultipleToQueue(songs); navigation.navigate('Player' as never); }}>
                  <Ionicons name="play" size={18} color={theme.colors.background} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.moreButton} onPress={() => { /* open options */ }}>
                  <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.6}
        ListFooterComponent={loadingMore ? (
          <View style={styles.footerLoader}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
        ) : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  rowInfoLeft: { flex: 1, justifyContent: 'center' },
  rowInfo: { flex: 1, marginLeft: 12 },
  rowTitle: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 18 },
  rowSubtitle: { color: theme.colors.textSecondary, marginTop: 4, fontSize: 13 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12 },
  playCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  rowDuration: { color: theme.colors.textSecondary },
});