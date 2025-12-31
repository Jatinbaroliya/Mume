export interface Song {
  id: string;
  name: string;
  type?: string;
  album: {
    id: string;
    name: string;
    url?: string;
  };
  year?: string;
  releaseDate?: string | null;
  duration: string | number;
  label?: string;
  primaryArtists?: string;
  primaryArtistsId?: string;
  featuredArtists?: string;
  featuredArtistsId?: string;
  explicitContent?: number;
  playCount?: string;
  language?: string;
  hasLyrics?: string;
  url?: string;
  copyright?: string;
  image: Array<{
    quality: string;
    link?: string;
    url?: string;
  }>;
  downloadUrl: Array<{
    quality: string;
    link?: string;
    url?: string;
  }>;
  artists?: {
    primary: Array<{
      id: string;
      name: string;
    }>;
  };
}

export interface SearchResponse {
  success?: boolean;
  status?: string;
  data: {
    results: Song[];
    total: number;
    start: number;
  };
}

export interface SongsResponse {
  success: boolean;
  data: Song[];
}

export type RepeatMode = 'none' | 'one' | 'all';
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

