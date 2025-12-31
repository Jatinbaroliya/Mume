import { Song } from '../types';

export const getArtistName = (song: Song): string => {
  // First try primaryArtists string
  if (song.primaryArtists) {
    return song.primaryArtists;
  }
  
  // Fallback to artists.primary array
  if (song.artists?.primary && song.artists.primary.length > 0) {
    return song.artists.primary.map(artist => artist.name).join(', ');
  }
  
  return 'Unknown Artist';
};

export const formatTime = (ms?: number | string | null): string => {
  if (ms === null || ms === undefined || ms === '') return '0:00';
  const n = Number(ms);
  if (isNaN(n) || n <= 0) return '0:00';

  // Handle both seconds and milliseconds. Heuristic: if value < 1000, treat as seconds; otherwise assume milliseconds.
  const millis = n < 1000 ? n * 1000 : n;

  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

