import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import notifee, { EventType } from '@notifee/react-native';
import { useEffect } from 'react';

import { Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Background event handler — runs even when the app is killed
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS || type === EventType.FULL_SCREEN_ACTION) {
    // Navigation will happen via the initial notification check in useEffect below
    await notifee.cancelDisplayedNotifications();
  }
});

const PillMateLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Brand.bg,
    card: Brand.bg,
    text: Brand.text,
    primary: Brand.green,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Handle notification press / fullscreen action while app is in foreground
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS || type === EventType.FULL_SCREEN_ACTION) {
        const data = detail.notification?.data;
        router.push({
          pathname: '/alarm',
          params: {
            medicationName: (data?.medicationName as string) ?? 'Medication',
            dosage: (data?.dosage as string) ?? '',
          },
        });
      }
    });

    // Check if app was launched by tapping a notification (cold start)
    notifee.getInitialNotification().then((initialNotification) => {
      if (initialNotification) {
        const data = initialNotification.notification.data;
        router.push({
          pathname: '/alarm',
          params: {
            medicationName: (data?.medicationName as string) ?? 'Medication',
            dosage: (data?.dosage as string) ?? '',
          },
        });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : PillMateLight}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alarm" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
