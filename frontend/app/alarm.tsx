import { Ionicons } from '@expo/vector-icons';
import notifee from '@notifee/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Brand } from '@/constants/theme';

export default function AlarmScreen() {
  const { medicationName, dosage } = useLocalSearchParams<{
    medicationName?: string;
    dosage?: string;
  }>();

  const pulse = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(ring, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0.6, duration: 120, useNativeDriver: true }),
        Animated.timing(ring, { toValue: -0.6, duration: 120, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(1200),
      ]),
    ).start();
  }, [pulse, ring]);

  const rotation = ring.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-20deg', '20deg'],
  });

  const now = new Date();
  const timeStr = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;

  async function dismiss() {
    await notifee.cancelDisplayedNotifications();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <View style={s.container}>
      {/* Time */}
      <Text style={s.time}>{timeStr}</Text>

      {/* Animated bell */}
      <Animated.View style={[s.iconWrap, { transform: [{ scale: pulse }] }]}>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="alarm" size={80} color={Brand.white} />
        </Animated.View>
      </Animated.View>

      {/* Medication info */}
      <Text style={s.label}>TIME FOR YOUR MEDICATION</Text>
      <Text style={s.medName}>{medicationName || 'Medication'}</Text>
      {dosage ? <Text style={s.dosage}>{dosage}</Text> : null}

      {/* Dismiss */}
      <Pressable style={s.dismissBtn} onPress={dismiss}>
        <Ionicons name="checkmark-circle" size={28} color={Brand.white} />
        <Text style={s.dismissTxt}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.emerald800,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  time: {
    fontSize: 48,
    fontWeight: '200',
    color: Brand.white,
    marginBottom: 40,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.emerald200,
    letterSpacing: 2,
    marginBottom: 8,
  },
  medName: {
    fontSize: 28,
    fontWeight: '800',
    color: Brand.white,
    textAlign: 'center',
    marginBottom: 6,
  },
  dosage: {
    fontSize: 18,
    fontWeight: '500',
    color: Brand.emerald200,
    marginBottom: 60,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dismissTxt: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.white,
  },
});
