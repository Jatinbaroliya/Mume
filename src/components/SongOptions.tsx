import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import theme from '../theme';
import { Song } from '../types';

interface Props {
  visible: boolean;
  song?: Song | null;
  onClose: () => void;
  onAction?: (action: string) => void;
}

export default function SongOptions({ visible, song, onClose, onAction }: Props) {
  if (!song) return null;

  const actions = [
    'Play',
    'Play Next',
    'Add to Playing Queue',
    'Add to Playlist',
    'Go to Album',
    'Go to Artist',
    'Details',
    'Set as Ringtone',
    'Add to Blacklist',
    'Share',
    'Delete from Device',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView>
            <Text style={styles.title}>{song.name}</Text>
            {actions.map((a) => (
              <TouchableOpacity
                key={a}
                style={styles.option}
                onPress={() => {
                  onAction && onAction(a);
                  onClose();
                }}
              >
                <Text style={styles.optionText}>{a}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 16,
  },
  grabber: {
    width: 40,
    height: 6,
    backgroundColor: theme.colors.divider,
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 8,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  optionText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  cancel: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
});