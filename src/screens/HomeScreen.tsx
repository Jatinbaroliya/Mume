import React, { useState, useCallback, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../store/playerStore';
import { searchSongs, getImageUrl, getAudioUrl, getPopularSongs, getArtistSongs, searchArtists } from '../services/api';
import artistCountsCache from '../utils/artistCounts';
import { audioService } from '../services/audioService';
import { Song } from '../types';
import { getArtistName, formatTime } from '../utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme';
import SongOptions from '../components/SongOptions';
import { sampleSongs } from '../data/sampleSongs';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Suggested'|'Songs'|'Artists'|'Albums'>('Suggested');
  const [optionsSong, setOptionsSong] = useState<Song | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [sortOption, setSortOption] = useState('Date Modified');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { playSong, addMultipleToQueue } = usePlayerStore();

  const performSearch = useCallback(async (query: string, pageNum: number = 1, append: boolean = false) => {
    if (!query.trim()) {
      setSongs([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await searchSongs(query, pageNum);
      console.log('API Response:', JSON.stringify(response, null, 2));
      
      // Handle different response structures
      let newSongs: Song[] = [];
      
      // Check for success: true format (actual API format)
      if (response.success === true && response.data && response.data.results) {
        newSongs = response.data.results || [];
      } 
      // Check for status: 'SUCCESS' format (documentation format)
      else if (response.status === 'SUCCESS' && response.data) {
        newSongs = response.data.results || [];
      } 
      // Fallback: check if results is directly in data
      else if (response.data && Array.isArray(response.data.results)) {
        newSongs = response.data.results;
      }
      // Fallback: check if data is array directly
      else if (response.data && Array.isArray(response.data)) {
        newSongs = response.data;
      }
      // Fallback: check if response is array directly
      else if (Array.isArray(response)) {
        newSongs = response;
      }
      // Fallback: check if results is at root level
      else if (response.results && Array.isArray(response.results)) {
        newSongs = response.results;
      } else {
        // Log the actual response structure for debugging
        console.warn('Unexpected response structure:', response);
        setError(`Unexpected response format. Check console for details.`);
      }
      
      console.log('Extracted songs:', newSongs.length);
      
      if (newSongs.length === 0 && !error) {
        setError('No songs found. The API might be returning an unexpected format.');
      }
      
      if (append) {
        setSongs(prev => [...prev, ...newSongs]);
      } else {
        setSongs(newSongs);
      }
      setHasMore(newSongs.length > 0);
    } catch (error: any) {
      console.error('Search error:', error);
      let errorMessage = 'Failed to search songs';
      
      if (error.response) {
        errorMessage = `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        errorMessage = 'Network Error: No response from server. Check your internet connection.';
        console.error('No response received:', error.request);
      } else {
        errorMessage = `Error: ${error.message}`;
        console.error('Error setting up request:', error.message);
      }
      
      setError(errorMessage);
      setSongs([]);
      
      // Show alert for critical errors
      if (error.request || error.code === 'NETWORK_ERROR') {
        Alert.alert('Network Error', 'Could not connect to the server. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search - wait 500ms after user stops typing
    if (text.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(text, 1, false);
      }, 500);
    } else {
      // If the search box is cleared and the user is on Songs tab, reload popular songs
      if (activeTab === 'Songs') {
        setPage(1);
        loadPopular(1, false);
      } else {
        setSongs([]);
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Load popular songs (supports pagination) and expose function for reuse
  const loadPopular = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setLoading(true);
    try {
      const popular = await getPopularSongs({ language: 'english', page: pageNum });
      if (popular && popular.length > 0) {
        if (append) {
          setSongs(prev => [...prev, ...popular]);
        } else {
          setSongs(popular);
        }
        setHasMore(popular.length > 0);
      } else {
        if (!append && pageNum === 1) {
          setSongs(sampleSongs);
        }
        setHasMore(false);
      }
    } catch (e) {
      console.warn('Failed to load popular songs:', e);
      if (!append && pageNum === 1) setSongs(sampleSongs);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (songs.length === 0) {
      loadPopular(1, false);
      setPage(1);
    }
  }, []);

  // Fetch artist counts when Artists tab is active
  useEffect(() => {
    if (activeTab === 'Artists' && songs.length > 0) {
      // Create artistsList from songs
      const artistsList = Array.from(new Map(songs.map(s => [getArtistName(s) || 'Unknown', s])).values());
      if (artistsList.length > 0) {
        // Fetch counts for first batch of artists
        artistsList.slice(0, 10).forEach(artist => {
          const name = getArtistName(artist);
          if (name && artistCountsRef.current[name] === undefined) {
            fetchArtistCountRef.current(artist);
          }
        });
      }
    }
  }, [activeTab, songs.length]);

  const handleLoadMore = () => {
    if (loading || !hasMore) return;

    const nextPage = page + 1;
    setPage(nextPage);

    if (searchQuery.trim()) {
      // Continue searching
      performSearch(searchQuery, nextPage, true);
    } else if (activeTab === 'Songs') {
      // Load more popular songs when on Songs tab and no search query
      loadPopular(nextPage, true);
    } else {
      // not on Songs tab - nothing to load
      setHasMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);

    try {
      if (searchQuery.trim()) {
        // If user has a search query, refresh search results
        await performSearch(searchQuery, 1, false);
      } else {
        // Otherwise refresh the popular list
        await loadPopular(1, false);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const [navigationLock, setNavigationLock] = useState(false);

  const handlePlaySong = async (song: Song, index: number) => {
    // Prevent rapid double-taps from performing navigation while views are still mounting
    if (navigationLock) return;
    setNavigationLock(true);

    const allSongs = songs;
    // Ensure any modals are closed before navigating to avoid conflicting view mounts
    setOptionsVisible(false);
    setSortVisible(false);

    // Wait until interactions and animations finish to avoid native view tag races
    InteractionManager.runAfterInteractions(() => {
      try {
        playSong(song, allSongs, index);
        addMultipleToQueue(allSongs);
        navigation.navigate('Player' as never);
      } catch (e) {
        console.warn('Navigation after interactions failed', e);
      } finally {
        // Keep a small delay to avoid immediate re-entry
        setTimeout(() => setNavigationLock(false), 500);
      }
    });
  };

  // Suggested data derivation
  const recentlyPlayed = songs.slice(0, 6);
  const artists = Array.from(new Map(songs.map(s => [getArtistName(s) || 'Unknown', s])).values()).slice(0, 8);
  const artistsList = Array.from(new Map(songs.map(s => [getArtistName(s) || 'Unknown', s])).values());
  const [artistCounts, setArtistCounts] = useState<Record<string, number | null>>(() => artistCountsCache.getAll());
  const artistCountsRef = useRef<Record<string, number | null>>(artistCountsCache.getAll());

  useEffect(() => {
    // subscribe to global cache updates so counts stay in sync when Artist screen fetches totals
    const unsub = artistCountsCache.subscribe((name, val) => {
      artistCountsRef.current = { ...artistCountsRef.current, [name]: val };
      setArtistCounts({ ...artistCountsRef.current });
    });
    return unsub;
  }, []);

  // Extract total helper similar to ArtistScreen
  const extractTotal = (resp: any): number | null => {
    if (!resp) return null;
    if (typeof resp.total === 'number') return resp.total;
    if (typeof resp.data?.total === 'number') return resp.data.total;
    if (typeof resp.data?.results?.total === 'number') return resp.data.results.total;
    if (typeof resp.data?.totalCount === 'number') return resp.data.totalCount;
    if (typeof resp.totalCount === 'number') return resp.totalCount;
    return null;
  };

  const fetchArtistCount = useCallback(async (item: any) => {
    const artistName = getArtistName(item) || 'Unknown';
    const key = artistName;
    if (artistCountsRef.current[key] !== undefined) return; // cached

    // optimistic set to null loading
    artistCountsRef.current[key] = null;
    setArtistCounts({ ...artistCountsRef.current });

    // try id -> getArtistSongs
    let artistId = item.artists?.primary?.[0]?.id || item.primaryArtistsId || null;

    if (!artistId && artistName) {
      try {
        const s = await searchArtists(artistName, 1);
        if (s?.data?.results && s.data.results.length > 0) artistId = s.data.results[0].id;
        else if (s?.results && s.results.length > 0) artistId = s.results[0].id;
        else if (Array.isArray(s) && s.length > 0 && s[0].id) artistId = s[0].id;
      } catch (e) {
        // ignore
      }
    }

    if (artistId) {
      try {
        const songsResp = await getArtistSongs(artistId, 1);
        const total = extractTotal(songsResp);
        const value = typeof total === 'number' ? total : (Array.isArray(songsResp?.data) ? songsResp.data.length : (Array.isArray(songsResp) ? songsResp.length : 0));
        artistCountsRef.current[key] = value;
        setArtistCounts({ ...artistCountsRef.current });
        // update global cache so other screens (Artist) can reflect the correct count
        artistCountsCache.set(key, value);
        return;
      } catch (e) {
        // continue to fallback
      }
    }

    // fallback: count in local songs array (best-effort)
    const localCount = songs.filter(s => (getArtistName(s) || '').toLowerCase() === artistName.toLowerCase()).length;
    artistCountsRef.current[key] = localCount;
    setArtistCounts({ ...artistCountsRef.current });
  }, [songs]);

  // Stable callback for onViewableItemsChanged - use ref to avoid recreating on songs change
  const fetchArtistCountRef = useRef(fetchArtistCount);
  useEffect(() => {
    fetchArtistCountRef.current = fetchArtistCount;
  }, [fetchArtistCount]);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    // Preload counts for visible items
    viewableItems.forEach((v: any) => {
      const artist = v.item;
      const name = getArtistName(artist);
      if (name && artistCountsRef.current[name] === undefined) {
        fetchArtistCountRef.current(artist);
      }
    });
  }, []);

  // Viewability config for onViewableItemsChanged
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const mostPlayed = songs.slice(0, 8);

  // Albums derived from songs
  const albumsList = Array.from(new Map(songs.map(s => [s.album?.id ?? (s.album?.name || s.name), s])).values()).map(s => ({
    id: s.album?.id ?? s.name,
    name: s.album?.name ?? s.name,
    image: s.album?.image ?? s.image,
    artist: getArtistName(s),
    count: songs.filter(x => x.album?.id === s.album?.id).length,
    raw: s,
  }));



  // Manual refresh handler to reload popular songs
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const refreshPopular = async () => {
    setRefreshing(true);
    setPage(1);
    await loadPopular(1, false);

    if (songs && songs.length > 0) setRefreshMessage('Popular updated');
    else setRefreshMessage('Showing sample songs');

    setTimeout(() => setRefreshMessage(null), 2500);
  };

  const renderSongItem = ({ item, index }: { item: Song; index: number }) => {
    const imageUrl = getImageUrl(item.image, '300x300', item.id || item.name);
    const artistName = getArtistName(item);
    const durationText = item.duration ? `${formatTime(item.duration)} mins` : '';

    return (
      <TouchableOpacity
        style={styles.songItem}
        onPress={() => handlePlaySong(item, index)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.songImageLarge}
        />

        <View style={styles.songInfoLeft}>
          <Text style={styles.songTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={styles.songSubtitle} numberOfLines={1} ellipsizeMode="tail">
            {artistName ? `${artistName}  |  ${durationText}` : durationText}
          </Text>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.playCircle}
            onPress={() => handlePlaySong(item, index)}
          >
            <Ionicons name="play" size={18} color={theme.colors.background} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={(e) => {
              e.stopPropagation();
              setOptionsSong(item);
              setOptionsVisible(true);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Render helpers for Suggested tab
  const renderRecentlyPlayed = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recently Played</Text>
        <View style={styles.sectionHeaderRight}>
          <TouchableOpacity onPress={refreshPopular} style={styles.refreshButton} disabled={loading} accessibilityLabel="Refresh popular songs">
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="refresh" size={18} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={recentlyPlayed}
        horizontal
        keyExtractor={(item, index) => `${item.id ?? item.name ?? index}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 20 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.recentCard} onPress={() => handlePlaySong(item, index)} disabled={navigationLock}>
            <Image source={{ uri: getImageUrl(item.image, '300x300', item.id || item.name) }} style={styles.recentImage} />
            <Text style={styles.recentTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.recentSubtitle} numberOfLines={1}>{getArtistName(item)}</Text>
          </TouchableOpacity>
        )}
      />
      <View style={styles.divider} />
    </View>
  );

  const renderArtistsRow = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Artists</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={artists}
        horizontal
        keyExtractor={(item: any, index) => `${getArtistName(item) ?? item.id ?? index}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 20 }}
        renderItem={({ item }) => {
          const artistName = getArtistName(item);
          const count = artistCounts[artistName] ?? songs.filter(s => getArtistName(s) === artistName).length;

          return (
            <TouchableOpacity style={styles.artistItem} onPress={() => {
              const artistId = item.artists?.primary?.[0]?.id || item.primaryArtistsId || null;
              if (artistId) navigation.navigate('Artist' as never, { artistId, artistName } as never);
              else navigation.navigate('Artist' as never, { artistName } as never);
            }}>
              <Image source={{ uri: getImageUrl(item.image, '200x200', getArtistName(item) || 'artist') }} style={styles.artistAvatar} />
              <Text style={styles.artistName} numberOfLines={1}>{artistName}</Text>
              <Text style={styles.artistCount}>{typeof count === 'number' ? `${count} ${count === 1 ? 'song' : 'songs'}` : '...'}</Text>
            </TouchableOpacity>
          );
        }}
        onEndReachedThreshold={0.1}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
    </View>
  );

  const renderMostPlayed = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Most Played</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={mostPlayed}
        horizontal
        keyExtractor={(item, index) => `${item.id ?? item.album?.id ?? item.name ?? index}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.albumCard} onPress={() => {
            const album = { id: item.album?.id, name: item.album?.name, image: item.image, artist: getArtistName(item), songs: songs.filter(s => s.album?.id === item.album?.id) };
            navigation.navigate('Album' as never, { album } as never);
          }}>
            <Image source={{ uri: getImageUrl(item.image, '300x300', item.album?.id || item.id || item.name) }} style={styles.albumImage} />
            <Text style={styles.albumTitle} numberOfLines={1}>{item.album?.name || item.name}</Text>
            <Text style={styles.albumSubtitle} numberOfLines={1}>{getArtistName(item)}</Text>
          </TouchableOpacity>
        )}
      />
      <View style={styles.divider} />
    </View>
  );
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.logo}>🎵</Text>
          <Text style={styles.headerTitle}>Mume</Text>
        </View>
        <View style={styles.tabs}>
          {['Suggested','Songs','Artists','Albums'].map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab as any)} style={styles.tabItem}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor={theme.colors.placeholder}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {activeTab === 'Suggested' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
          {renderRecentlyPlayed()}
          {renderArtistsRow()}
          {renderMostPlayed()}
        </ScrollView>
      ) : activeTab === 'Songs' ? (
        <View>
          <View style={styles.songsHeader}>
            <TouchableOpacity onPress={() => setSortVisible(true)} style={styles.sortButton}>
              <Text style={styles.sortText}>{sortOption} ▾</Text>
            </TouchableOpacity>
          </View>

          {loading && songs.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : songs.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No songs found. Try a different search term.' : 'Search for your favorite songs'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={songs}
              renderItem={renderSongItem}
              keyExtractor={(item, index) => `${item.id ?? item.name ?? index}-${index}`}
              contentContainerStyle={styles.listContent}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.colors.primary}
                />
              }
              ListFooterComponent={
                loading && songs.length > 0 ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : null
              }
            />
          )}
        </View>
      ) : activeTab === 'Artists' ? (
        // Artists list view
        songs.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No artists available</Text>
          </View>
        ) : (
          <FlatList
            data={artistsList}
            renderItem={({ item }) => {
              const artistName = getArtistName(item) || 'Unknown';
              const imageUrl = getImageUrl(item.image, '300x300', artistName);
              const count = artistCounts[artistName] ?? songs.filter(s => getArtistName(s) === artistName).length;

              return (
                <TouchableOpacity
                  style={styles.artistRow}
                  onPress={() => {
                    const artistId = item.artists?.primary?.[0]?.id || item.primaryArtistsId || null;
                    navigation.navigate('Artist' as never, { artistId, artistName } as never);
                  }}
                >
                  <Image source={{ uri: imageUrl }} style={styles.artistRowImage} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.songTitle} numberOfLines={1}>{artistName}</Text>
                    <Text style={styles.songSubtitle}>{typeof count === 'number' ? `${count} ${count === 1 ? 'song' : 'songs'}` : '...'}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item, idx) => `${getArtistName(item) ?? item.id ?? idx}-${idx}`}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          />
        )
      ) : activeTab === 'Albums' ? (
        // Albums list view
        songs.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No albums available</Text>
          </View>
        ) : (
          <FlatList
            data={albumsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.albumRow}
                onPress={() => navigation.navigate('Album' as never, { album: { id: item.id, name: item.name, image: item.image, artist: item.artist, songs: songs.filter(s => s.album?.id === item.id || s.album?.name === item.name) } } as never)}
              >
                <Image source={{ uri: getImageUrl(item.image, '300x300', item.id) }} style={styles.albumRowImage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.songTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.songSubtitle}>{item.artist}</Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item, idx) => `${item.id ?? item.name ?? idx}-${idx}`}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          />
        )
      ) : loading && songs.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : songs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No songs found. Try a different search term.' : 'Search for your favorite songs'}
          </Text>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.errorHint}>
                Open your terminal/console to see detailed logs
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSongItem}
          keyExtractor={(item, index) => `${item.id ?? item.name ?? index}-${index}`}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListFooterComponent={
            loading && songs.length > 0 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      {/* Song options modal */}
      <SongOptions
        visible={optionsVisible}
        song={optionsSong}
        onClose={() => setOptionsVisible(false)}
        onAction={(action) => {
          // handle actions if needed
          console.log('Selected action', action);
        }}
      />

      {/* Sort modal simple */}
      <Modal visible={sortVisible} transparent animationType="fade" onRequestClose={() => setSortVisible(false)}>
        <View style={styles.sortBackdrop}>
          <View style={styles.sortSheet}>
            {['Ascending','Descending','Artist','Album','Year','Date Added','Date Modified','Composer'].map(o => (
              <TouchableOpacity key={o} style={styles.sortOption} onPress={() => { setSortOption(o); setSortVisible(false); }}>
                <Text style={styles.sortOptionText}>{o}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sortCancel} onPress={() => setSortVisible(false)}>
              <Text style={styles.sortCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Refresh result snackbar */}
      {refreshMessage && (
        <View style={styles.snackbar} pointerEvents="none">
          <Text style={styles.snackbarText}>{refreshMessage}</Text>
        </View>
      )}

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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 22,
    color: theme.colors.primary,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  tabItem: {
    alignItems: 'center',
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tabIndicator: {
    height: 3,
    width: '100%',
    marginTop: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInput: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  listContent: {
    paddingBottom: 100,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  songImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
  },
  songImageLarge: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 16,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  songTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  songSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  songArtist: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  songAlbum: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: theme.colors.background,
    fontSize: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 8,
    maxWidth: '90%',
  },
  errorText: {
    color: theme.colors.primary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  errorHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  sortBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortSheet: {
    width: '80%',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  sortOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  sortOptionText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  sortCancel: {
    padding: 12,
    alignItems: 'center',
  },
  sortCancelText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 6,
  },
  divider: {
    height: 8,
    backgroundColor: theme.colors.surface,
  },
  // Simple snackbar for showing refresh results
  snackbar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 100,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  snackbarText: {
    color: '#fff',
    fontSize: 14,
  },
  songsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  artistRowImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    backgroundColor: theme.colors.surfaceMuted,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  albumRowImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: theme.colors.surfaceMuted,
  },
  songsCount: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.sm,
  },
  sortText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  songInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  songInfoLeft: {
    flex: 1,
  },
  songMeta: {
    alignItems: 'flex-end',
    width: 120,
    marginLeft: 8,
  },
  songDuration: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  smallPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallPlayIcon: {
    color: theme.colors.background,
    fontSize: 14,
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIcon: {
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  recentCard: {
    width: 140,
    marginRight: 12,
  },
  recentImage: {
    width: 140,
    height: 140,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surfaceMuted,
  },
  recentTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  recentSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  artistItem: {
    width: 84,
    marginRight: 12,
    alignItems: 'center',
  },
  artistAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surfaceMuted,
  },
  artistName: {
    marginTop: 8,
    color: theme.colors.textPrimary,
    fontSize: 12,
    textAlign: 'center',
  },
  artistCount: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  albumCard: {
    width: 140,
    marginRight: 12,
  },
  albumImage: {
    width: 140,
    height: 140,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  albumTitle: {
    marginTop: 8,
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  albumSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
});

