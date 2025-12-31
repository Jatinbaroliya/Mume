import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TabIconProps {
  name: string;
  color: string;
}

export default function TabIcon({ name, color }: TabIconProps) {
  const map: Record<string, string> = {
    Home: 'home-outline',
    Queue: 'list-outline',
  };

  const iconName = map[name] || 'ellipse';

  return (
    <View style={styles.container}>
      <Ionicons name={iconName as any} size={22} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

