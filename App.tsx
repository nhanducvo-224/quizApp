import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from './src/database/db';
import { RootStackParamList } from './src/navigation/types';
import HomeScreen from './src/screens/HomeScreen';
import CategoryDetailScreen from './src/screens/CategoryDetailScreen';
import LevelSelectScreen from './src/screens/LevelSelectScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [dbInitialized, setDbInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setupApp() {
      try {
        await initDatabase();
        setDbInitialized(true);
      } catch (err) {
        console.error('Lỗi khởi tạo ứng dụng:', err);
        setError('Không thể kết nối đến cơ sở dữ liệu. Vui lòng mở lại ứng dụng.');
      }
    }
    setupApp();
  }, []);

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFCD00" />
        <Text style={styles.loadingText}>Đang khởi tạo ứng dụng...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0A0A1A',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
            color: '#FFCD00',
          },
          contentStyle: {
            backgroundColor: '#0A0A1A',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="LevelSelect" 
          component={LevelSelectScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CategoryDetail" 
          component={CategoryDetailScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Leaderboard" 
          component={LeaderboardScreen} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#A0A0B0',
    marginTop: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#DA251D',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
