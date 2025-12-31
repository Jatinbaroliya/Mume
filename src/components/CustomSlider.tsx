import React, { useState, useRef } from 'react';
import { View, StyleSheet, PanResponder, Dimensions, TouchableOpacity } from 'react-native';
import theme from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CustomSliderProps {
  minimumValue: number;
  maximumValue: number;
  value: number;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
}

export default function CustomSlider({
  minimumValue,
  maximumValue,
  value,
  onValueChange,
  onSlidingComplete,
  minimumTrackTintColor = theme.colors.primary,
  maximumTrackTintColor = theme.colors.divider,
  thumbTintColor = theme.colors.primary,
}: CustomSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderWidth = SCREEN_WIDTH - 80;
  const trackRef = useRef<View>(null);

  const getValueFromPosition = (x: number) => {
    const percentage = Math.max(0, Math.min(1, x / sliderWidth));
    return minimumValue + (maximumValue - minimumValue) * percentage;
  };

  const getPositionFromValue = (val: number) => {
    if (maximumValue === minimumValue) return 0;
    const percentage = (val - minimumValue) / (maximumValue - minimumValue);
    return percentage * sliderWidth;
  };

  const handlePress = (evt: any) => {
    try {
      const { locationX } = evt.nativeEvent;
      const newValue = getValueFromPosition(locationX);
      onValueChange(newValue);
      onSlidingComplete(newValue);
    } catch (e) {
      console.warn('Slider press handler error', e);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        try {
          setIsDragging(true);
          const { locationX } = evt.nativeEvent;
          const newValue = getValueFromPosition(locationX);
          onValueChange(newValue);
        } catch (e) {
          console.warn('Slider grant handler error', e);
        }
      },
      onPanResponderMove: (evt) => {
        try {
          const { locationX } = evt.nativeEvent;
          const newValue = getValueFromPosition(locationX);
          onValueChange(newValue);
        } catch (e) {
          // ignore
        }
      },
      onPanResponderRelease: (evt) => {
        try {
          setIsDragging(false);
          const { locationX } = evt.nativeEvent;
          const newValue = getValueFromPosition(locationX);
          onSlidingComplete(newValue);
        } catch (e) {
          console.warn('Slider release handler error', e);
        }
      },
    })
  ).current;

  const currentPosition = getPositionFromValue(value);
  const progressPercentage = maximumValue > minimumValue 
    ? ((value - minimumValue) / (maximumValue - minimumValue)) * 100 
    : 0;

  return (
    <View style={styles.container}>
      <View
        onStartShouldSetResponder={() => true}
        onResponderGrant={handlePress}
        ref={trackRef}
        style={styles.touchable}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.track,
            { backgroundColor: maximumTrackTintColor },
          ]}
        >
          <View
            style={[
              styles.progress,
              {
                width: `${progressPercentage}%`,
                backgroundColor: minimumTrackTintColor,
              },
            ]}
          />
          <View
            style={[
              styles.thumb,
              {
                left: currentPosition - 10,
                backgroundColor: thumbTintColor,
                transform: [{ scale: isDragging ? 1.2 : 1 }],
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchable: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    position: 'relative',
  },
  progress: {
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});
