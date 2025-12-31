import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import theme from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { usePlayerStore } from '../store/playerStore';
import { getImageUrl, getAlbumById, getAlbumSongs, searchAlbums, searchSongs } from '../services/api';
import { formatTime } from '../utils/helpers';

export default function AlbumScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { album } = (route.params as any) || {};
  const albumId = album?.id;
  const albumName = album?.name;
  const [songs, setSongs] = useState<Song[]>(album?.songs || []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSongs, setTotalSongs] = useState<number | null>(null);
  const { playSong, addMultipleToQueue } = usePlayerStore();

  useEffect(() => {
    // Only fetch from API if we have a valid album ID (not just a name fallback)
    // If albumId looks like it might be invalid (e.g., same as name), skip API call
    if (albumId && albumId !== albumName && albumId.length > 3) {
      fetchAlbum(1);
    } else if (albumName && (!album?.songs || album.songs.length === 0)) {
      // Only try API if we don't have songs already
      fetchAlbumByName(1);
    } else if (album?.songs && album.songs.length > 0) {
      // Use passed songs if available
      setSongs(album.songs);
    }
  }, [albumId, albumName]);

  async function fetchAlbum(pageNum: number = 1, append: boolean = false) {
    if (!albumId) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    // Helper to normalize various API response shapes into Song[]
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
      // Fetch album metadata and songs
      let albumMeta: any = null;
      let songsResp: any = null;

      try {
        const [a, sResp] = await Promise.all([getAlbumById(albumId), getAlbumSongs(albumId, pageNum)]);
        albumMeta = a?.data || a;
        songsResp = sResp;
      } catch (apiError: any) {
        // If 404, the endpoint doesn't exist - try fallback approach
        if (apiError?.response?.status === 404) {
          // Try searching for songs by album name instead
          if (albumName) {
            const searchResp = await searchSongs(albumName, pageNum);
            songsResp = searchResp;
          } else {
            throw apiError;
          }
        } else {
          throw apiError;
        }
      }

      // Normalize and filter songs
      let rawSongs = extractSongs(songsResp);

      // Try to extract total from API responses
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
      if (apiTotal !== null) setTotalSongs(apiTotal);

      // Filter songs by album ID or name if available
      if (rawSongs.length > 0 && (albumId || albumName)) {
        const filtered = rawSongs.filter((song: Song) => {
          if (!song.album) return false;
          if (albumId && song.album.id === albumId) return true;
          if (albumName && song.album.name === albumName) return true;
          return false;
        });
        if (filtered.length > 0) rawSongs = filtered;
      }

      if (rawSongs.length > 0) {
        if (append) {
          setSongs(prev => [...prev, ...rawSongs]);
        } else {
          setSongs(rawSongs);
        }
        setHasMore(rawSongs.length > 0);
      } else if (!append) {
        // If no songs found and not appending, use fallback
        throw new Error('No songs found from API');
      }
    } catch (error: any) {
      // Only log non-404 errors to reduce noise
      if (error?.response?.status !== 404) {
        console.warn('Error fetching album:', error?.message || error);
      }
      // Fallback to passed songs if API fails
      if (!append) {
        if (album?.songs && album.songs.length > 0) {
          setSongs(album.songs);
          setHasMore(false);
        } else if (albumName) {
          // Last resort: try searching by album name
          try {
            const searchResp = await searchSongs(albumName, pageNum);
            const rawSongs = extractSongs(searchResp);
            const filtered = rawSongs.filter((song: Song) => {
              if (!song.album) return false;
              return song.album.name === albumName;
            });
            if (filtered.length > 0) {
              setSongs(filtered);
              setHasMore(false);
            }
          } catch (searchError) {
            // Silent fail - use empty array
            if (!album?.songs) setSongs([]);
          }
        }
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  async function fetchAlbumByName(pageNum: number = 1) {
    if (!albumName) return;
    setLoading(true);

    try {
      // Search for album by name
      const searchResp = await searchAlbums(albumName, pageNum);
      let albumId: string | null = null;

      if (searchResp?.data?.results && Array.isArray(searchResp.data.results) && searchResp.data.results.length > 0) {
        albumId = searchResp.data.results[0].id;
      } else if (searchResp?.results && Array.isArray(searchResp.results) && searchResp.results.length > 0) {
        albumId = searchResp.results[0].id;
      }

      if (albumId) {
        // Now fetch songs using the album ID
        await fetchAlbum(pageNum, false);
      } else {
        // Fallback: search songs by album name
        const songsResp = await searchSongs(albumName, pageNum);
        const extractSongs = (resp: any): Song[] => {
          if (!resp) return [];
          if (Array.isArray(resp.data?.results)) return resp.data.results as Song[];
          if (Array.isArray(resp.results)) return resp.results as Song[];
          if (Array.isArray(resp.data)) return resp.data as Song[];
          if (Array.isArray(resp)) return resp as Song[];
          return [];
        };
        const rawSongs = extractSongs(songsResp);
        const filtered = rawSongs.filter((song: Song) => {
          if (!song.album) return false;
          return song.album.name === albumName;
        });
        setSongs(filtered);
      }
    } catch (error: any) {
      console.error('Error fetching album by name:', error);
      if (album?.songs && album.songs.length > 0) {
        setSongs(album.songs);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleLoadMore = () => {
    if (loading || !hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    if (albumId) {
      fetchAlbum(nextPage, true);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    if (albumId) {
      await fetchAlbum(1, false);
    } else if (albumName) {
      await fetchAlbumByName(1);
    }
  };

  const handlePlayAll = () => {
    if (!songs || songs.length === 0) return;
    playSong(songs[0], songs, 0);
    addMultipleToQueue(songs);
    navigation.navigate('Player' as never);
  };

  const imageUrl = getImageUrl(album?.image || [], '500x500');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: imageUrl }} style={styles.artwork} />
        <Text style={styles.title}>{album?.name || albumName}</Text>
        <Text style={styles.subtitle}>{album?.artist || ''} {totalSongs !== null ? `• ${totalSongs} Songs` : songs.length > 0 ? `• ${songs.length} Songs` : ''}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handlePlayAll}><Text style={styles.primaryText}>Shuffle</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}><Text style={styles.secondaryText}>Play</Text></TouchableOpacity>
        </View>
      </View>

      {loading && songs.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
          }
          ListFooterComponent={loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null}
        />
      )}
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
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  moreButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceMuted, justifyContent: 'center', alignItems: 'center' },
});