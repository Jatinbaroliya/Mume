import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Song, RepeatMode, PlaybackStatus } from '../types';
import { Storage } from '../utils/storage';

interface PlayerState {
  // Current playback
  currentSong: Song | null;
  playbackStatus: PlaybackStatus;
  position: number;
  duration: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  
  // Queue
  queue: Song[];
  currentIndex: number;
  history: Song[];
  
  // Actions
  setCurrentSong: (song: Song | null) => void;
  setPlaybackStatus: (status: PlaybackStatus) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  
  // Queue actions
  addToQueue: (song: Song) => void;
  addMultipleToQueue: (songs: Song[]) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  setQueue: (songs: Song[], startIndex?: number) => void;
  nextSong: () => Song | null;
  previousSong: () => Song | null;
  playSong: (song: Song, queue?: Song[], index?: number) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      playbackStatus: 'idle',
      position: 0,
      duration: 0,
      isShuffled: false,
      repeatMode: 'none',
      queue: [],
      currentIndex: -1,
      history: [],

      setCurrentSong: (song) => set({ currentSong: song }),
      setPlaybackStatus: (status) => set({ playbackStatus: status }),
      setPosition: (position) => set({ position }),
      setDuration: (duration) => set({ duration }),
      toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
      setRepeatMode: (mode) => set({ repeatMode: mode }),

      addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),
      addMultipleToQueue: (songs) => set((state) => ({ queue: [...state.queue, ...songs] })),
      removeFromQueue: (index) => set((state) => {
        const newQueue = [...state.queue];
        newQueue.splice(index, 1);
        let newIndex = state.currentIndex;
        if (index < state.currentIndex) {
          newIndex = state.currentIndex - 1;
        } else if (index === state.currentIndex && newQueue.length > 0) {
          newIndex = Math.min(state.currentIndex, newQueue.length - 1);
        } else if (newQueue.length === 0) {
          newIndex = -1;
        }
        return { queue: newQueue, currentIndex: newIndex };
      }),
      reorderQueue: (fromIndex, toIndex) => set((state) => {
        const newQueue = [...state.queue];
        const [moved] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, moved);
        let newIndex = state.currentIndex;
        if (fromIndex === state.currentIndex) {
          newIndex = toIndex;
        } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
          newIndex = state.currentIndex - 1;
        } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
          newIndex = state.currentIndex + 1;
        }
        return { queue: newQueue, currentIndex: newIndex };
      }),
      clearQueue: () => set({ queue: [], currentIndex: -1 }),
      setQueue: (songs, startIndex = 0) => set({ queue: songs, currentIndex: startIndex }),
      
      nextSong: () => {
        const state = get();
        if (state.queue.length === 0) return null;
        
        let nextIndex: number;
        if (state.isShuffled) {
          nextIndex = Math.floor(Math.random() * state.queue.length);
        } else {
          nextIndex = (state.currentIndex + 1) % state.queue.length;
        }
        
        if (state.repeatMode === 'none' && nextIndex === 0 && !state.isShuffled && state.currentIndex === state.queue.length - 1) {
          return null;
        }
        
        const nextSong = state.queue[nextIndex];
        set({ 
          currentIndex: nextIndex,
          currentSong: nextSong,
          playbackStatus: 'loading',
        });
        return nextSong;
      },
      
      previousSong: () => {
        const state = get();
        if (state.queue.length === 0) return null;
        
        let prevIndex: number;
        if (state.isShuffled) {
          prevIndex = Math.floor(Math.random() * state.queue.length);
        } else {
          prevIndex = state.currentIndex <= 0 ? state.queue.length - 1 : state.currentIndex - 1;
        }
        
        const prevSong = state.queue[prevIndex];
        set({ 
          currentIndex: prevIndex,
          currentSong: prevSong,
          playbackStatus: 'loading',
        });
        return prevSong;
      },
      
      playSong: (song, queue, index) => {
        if (queue && queue.length > 0) {
          const songIndex = index !== undefined ? index : queue.findIndex(s => s.id === song.id);
          set({
            currentSong: song,
            queue,
            currentIndex: songIndex >= 0 ? songIndex : 0,
            playbackStatus: 'loading',
          });
        } else {
          set({
            currentSong: song,
            playbackStatus: 'loading',
          });
        }
      },
    }),
    {
      name: 'player-storage',
      storage: createJSONStorage(() => Storage),
      partialize: (state) => ({
        queue: state.queue,
        currentIndex: state.currentIndex,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode,
      }),
    }
  )
);

