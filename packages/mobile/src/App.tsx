import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ScreenshotProvider } from './contexts/ScreenshotContext';

import AuthNavigator from './navigation/AuthNavigator';
import MainNavigator from './navigation/MainNavigator';
import LoadingScreen from './screens/LoadingScreen';
import { useAuth } from './contexts/AuthContext';

const Stack = createStackNavigator();

// 主应用内容组件
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// 根应用组件
const App: React.FC = () => {
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        console.log('Permissions granted:', granted);
      } catch (error) {
        console.error('Permission request failed:', error);
      }
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />
      <AuthProvider>
        <SettingsProvider>
          <NotificationProvider>
            <ScreenshotProvider>
              <AppContent />
            </ScreenshotProvider>
          </NotificationProvider>
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
