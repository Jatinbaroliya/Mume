import AsyncStorage from '@react-native-async-storage/async-storage';

// Create an async storage adapter for Zustand
// Zustand's createJSONStorage expects synchronous methods, but we can work around this
// by using a cache and syncing in the background

let storageCache: Record<string, string> = {};
let isInitialized = false;

// Initialize cache from AsyncStorage
export const initializeStorage = async () => {
  if (isInitialized) return;
  
  try {
    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(keys);
    storageCache = Object.fromEntries(
      items.filter(([_, value]) => value !== null) as [string, string][]
    );
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    isInitialized = true; // Set to true even on error to prevent infinite loops
  }
};

// Synchronous storage interface for Zustand
export const Storage = {
  getItem: (name: string): string | null => {
    // Return from cache synchronously
    return storageCache[name] ?? null;
  },
  setItem: (name: string, value: string): void => {
    // Update cache immediately
    storageCache[name] = value;
    // Sync to AsyncStorage asynchronously (fire and forget)
    AsyncStorage.setItem(name, value).catch((error) => {
      console.error('Error setting item in AsyncStorage:', error);
    });
  },
  removeItem: (name: string): void => {
    // Remove from cache immediately
    delete storageCache[name];
    // Sync to AsyncStorage asynchronously (fire and forget)
    AsyncStorage.removeItem(name).catch((error) => {
      console.error('Error removing item from AsyncStorage:', error);
    });
  },
};
