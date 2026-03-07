import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/theme';

function BounceDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -8, duration: 300, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View style={[styles.dot, { transform: [{ translateY: anim }] }]} />
  );
}

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    const timer = setTimeout(() => {
      router.replace('/auth');
    }, 2500);
    return () => clearTimeout(timer);
  }, [scale, opacity]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoCard, { transform: [{ scale }], opacity }]}>
        <Animated.Text style={styles.logoEmoji}>💊</Animated.Text>
        <Animated.Text style={styles.logoText}>PillMate</Animated.Text>
        <View style={styles.dotsRow}>
          <BounceDot delay={0} />
          <BounceDot delay={150} />
          <BounceDot delay={300} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCard: {
    backgroundColor: Brand.white,
    paddingHorizontal: 48,
    paddingVertical: 40,
    borderRadius: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: Brand.slate100,
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: Brand.emerald800,
    letterSpacing: 1,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.emerald500,
  },
});
