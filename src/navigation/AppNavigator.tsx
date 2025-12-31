import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import PlayerScreen from '../screens/PlayerScreen';
import QueueScreen from '../screens/QueueScreen';
import ArtistScreen from '../screens/ArtistScreen';
import AlbumScreen from '../screens/AlbumScreen';
import MiniPlayer from '../components/MiniPlayer';
import TabIcon from '../components/TabIcon';
import theme from '../theme';
import { View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => <TabIcon name="Home" color={color} />,
        }}
      />
      <Tab.Screen 
        name="Queue" 
        component={QueueScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => <TabIcon name="Queue" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="MainTabs" component={HomeTabs} />
          <Stack.Screen name="Artist" component={ArtistScreen} />
          <Stack.Screen name="Album" component={AlbumScreen} />
          <Stack.Screen 
            name="Player" 
            component={PlayerScreen}
            options={{
              presentation: 'fullScreenModal',
            }}
          />
        </Stack.Navigator>
        <MiniPlayer />
      </View>
    </NavigationContainer>
  );
}

