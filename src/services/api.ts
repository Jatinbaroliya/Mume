import axios from 'axios';
import { Song, SearchResponse, SongsResponse } from '../types';

const BASE_URL = 'https://saavn.sumit.co';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

export const searchSongs = async (query: string, page: number = 1): Promise<SearchResponse> => {
  try {
    console.log('Searching for:', query, 'page:', page);
    const response = await api.get<SearchResponse>('/api/search/songs', {
      params: {
        query,
        page,
      },
    });
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    console.error('Error searching songs:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    throw error;
  }
};

export const searchAlbums = async (query: string, page: number = 1): Promise<SearchResponse> => {
  try {
    const response = await api.get<SearchResponse>('/api/search/albums', {
      params: {
        query,
        page,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching albums:', error);
    throw error;
  }
};

export const searchArtists = async (query: string, page: number = 1): Promise<SearchResponse> => {
  try {
    const response = await api.get<SearchResponse>('/api/search/artists', {
      params: {
        query,
        page,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching artists:', error);
    throw error;
  }
};

export const getSongById = async (id: string): Promise<SongsResponse> => {
  try {
    const response = await api.get<SongsResponse>(`/api/songs/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching song:', error);
    throw error;
  }
};

export const getSongSuggestions = async (id: string): Promise<SongsResponse> => {
  try {
    const response = await api.get<SongsResponse>(`/api/songs/${id}/suggestions`);
    return response.data;
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    throw error;
  }
};

export const getArtistById = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/api/artists/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching artist:', error);
    throw error;
  }
};

export const getArtistSongs = async (id: string, page: number = 1): Promise<SongsResponse> => {
  try {
    const response = await api.get<SongsResponse>(`/api/artists/${id}/songs`, { params: { page } });
    return response.data;
  } catch (error) {
    console.error('Error fetching artist songs:', error);
    throw error;
  }
};

export const getArtistAlbums = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/api/artists/${id}/albums`);
    return response.data;
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    throw error;
  }
};

/**
 * Try multiple possible endpoints to fetch currently popular / top songs.
 * Returns an array of Song objects if found, otherwise an empty array.
 */
export const getPopularSongs = async (options?: { endpoints?: string[]; language?: string; page?: number }): Promise<Song[]> => {
  const candidates = options?.endpoints ?? [
    '/api/charts',
    '/api/charts/songs',
    '/api/songs/popular',
    '/api/songs/top',
    '/api/charts/top',
    '/api/popular/songs',
  ];

  const lang = options?.language?.toLowerCase();
  const page = options?.page ?? 1;
  const matchesLanguage = (song: Song): boolean => {
    if (!lang) return true;
    if (!song) return false;
    const l = (song.language || song.language?.toString() || '').toLowerCase();
    if (l.includes(lang) || l.startsWith(lang.slice(0, 2))) return true;
    // fallback: try primaryArtists/album/title heuristics (very basic)
    const name = (song.name || '').toLowerCase();
    if (lang === 'english') {
      // if the title contains any non-latin characters, assume not english
      if (/[^\u0000-\u007F]/.test(name)) return false;
      return true;
    }
    return false;
  };

  let sawNetworkError = false;
  for (const endpoint of candidates) {
    try {
      const response = await api.get(endpoint, { params: { page } });
      const data = response?.data;
      let songs: Song[] = [];

      if (Array.isArray(data)) {
        songs = data as Song[];
      } else if (data?.data && Array.isArray(data.data.results)) {
        songs = data.data.results;
      } else if (data?.results && Array.isArray(data.results)) {
        songs = data.results;
      } else if (data?.data && Array.isArray(data.data)) {
        songs = data.data;
      }

      if (songs && songs.length > 0) {
        if (lang) {
          const filtered = songs.filter(matchesLanguage);
          if (filtered.length > 0) return filtered;
        }
        return songs;
      }
    } catch (err: any) {
      const status = err?.response?.status;
      // Avoid noisy logs for expected 404s; only warn for non-404 HTTP errors and network issues
      if (!status && err?.request) {
        // Network error (no response)
        sawNetworkError = true;
        console.warn(`Popular endpoint ${endpoint} failed: Network error or no response.`);
      } else if (status && status !== 404) {
        console.warn(`Popular endpoint ${endpoint} failed: HTTP ${status}`);
      }
      // otherwise ignore 404s silently
    }
  }

  // Final fallback: attempt a search for 'popular' (and language if provided)
  try {
    const q = lang ? `popular ${lang}` : 'popular';
    const response = await api.get('/api/search/songs', { params: { query: q, page } });
    const data = response?.data;
    let songs: Song[] = [];
    if (data?.data && Array.isArray(data.data.results)) songs = data.data.results;
    else if (Array.isArray(data)) songs = data as Song[];

    if (songs.length > 0) {
      if (lang) {
        const filtered = songs.filter(matchesLanguage);
        if (filtered.length > 0) return filtered;
      }
      return songs;
    }
  } catch (err: any) {
    const status = err?.response?.status;
    if (!status && err?.request) {
      console.warn('Fallback search for popular songs failed: Network error or no response.');
      sawNetworkError = true;
    } else if (status && status !== 404) {
      console.warn('Fallback search for popular songs failed: HTTP ' + status);
    }
  }

  if (sawNetworkError) {
    console.warn('Some popular endpoints failed due to network issues. Check your connection.');
  }

  return [];
};

export const getImageUrl = (images: Song['image'] | undefined, quality: string = '500x500', fallbackSeed?: string): string => {
  const seed = encodeURIComponent(fallbackSeed || 'music');
  if (!images || images.length === 0) return `https://picsum.photos/seed/${seed}/500/500`;
  const image = images.find((img: { quality: string; link?: string; url?: string }) => img.quality === quality) || images[images.length - 1];
  return image?.link || image?.url || `https://picsum.photos/seed/${seed}/500/500`;
};

export const getAudioUrl = (downloadUrls: Song['downloadUrl'], quality: string = '320kbps'): string => {
  if (!downloadUrls || downloadUrls.length === 0) return '';
  const url = downloadUrls.find((dl: { quality: string; link?: string; url?: string }) => dl.quality === quality) || downloadUrls[downloadUrls.length - 1];
  return url?.link || url?.url || '';
};

