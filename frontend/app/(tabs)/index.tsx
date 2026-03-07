import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Brand } from '@/constants/theme';
import { api } from '../../services/axiosApi';
import {
  cacheProfile,
  cacheMedications,
  cacheAlarms,
  getCachedProfile,
  getCachedMedications,
  getCachedAlarms,
} from '../../services/localCache';

export default function HomeTab() {
  const [profile, setProfile] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Load cache first for instant display
      const [cachedProfile, cachedMeds, cachedAlarms] = await Promise.all([
        getCachedProfile(),
        getCachedMedications(),
        getCachedAlarms(),
      ]);
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedMeds.length) setMedications(cachedMeds);
      if (cachedAlarms.length) setAlarms(cachedAlarms);

      // Then fetch fresh data from API
      const [profileRes, prescriptionsRes, alarmsRes] = await Promise.all([
        api.get('/auth/profile'),
        api.get('/medications'),
        api.get('/alarms'),
      ]);
      setProfile(profileRes.data);
      setMedications(prescriptionsRes.data);
      setAlarms(alarmsRes.data);

      // Update cache
      await Promise.all([
        cacheProfile(profileRes.data),
        cacheMedications(prescriptionsRes.data),
        cacheAlarms(alarmsRes.data),
      ]);
    } catch (e: any) {
      if (e.response?.status === 401) {
        await SecureStore.deleteItemAsync('userToken');
        router.replace('/auth');
      } else {
        // If network fails, cached data is already displayed
        if (!profile) {
          Alert.alert('Error', 'Failed to load dashboard data');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    const { clearAllCache } = await import('../../services/localCache');
    await clearAllCache();
    router.replace('/auth');
  };

  if (loading && !profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Brand.emerald500} />
      </View>
    );
  }

  // Find next alarm
  const nextAlarm = alarms.length > 0 ? alarms[0] : null;
  const nextMed = nextAlarm
    ? medications.find((p: any) => p.id === nextAlarm.medication_id)
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.username?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.headerLabel}>DAILY PROGRESS</Text>
            <Text style={styles.headerGreeting}>
              Hello, {profile?.username || 'User'}
            </Text>
          </View>
        </View>
        <Pressable style={styles.logoutRing} onPress={handleLogout}>
          <Text style={styles.logoutText}>Exit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Next Dose Hero Card */}
        {nextMed ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>
                  NEXT DOSE · {nextAlarm.time}
                </Text>
              </View>
              <Text style={{ fontSize: 16 }}>🔔</Text>
            </View>
            <Text style={styles.heroTitle}>{nextMed.name}</Text>
            <Text style={styles.heroSub}>
              {[nextMed.dosage, `${nextMed.frequency}x daily`].filter(Boolean).join(' · ')}
            </Text>

            <View style={styles.heroBottom}>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>ALARM SET</Text>
                <Text style={styles.timeValue}>{nextAlarm.time}</Text>
              </View>
            </View>

            <View style={styles.heroBlur} />
          </View>
        ) : (
          <View style={[styles.heroCard, { backgroundColor: Brand.slate800 }]}>
            <Text style={styles.heroTitle}>No Alarms Scheduled</Text>
            <Text style={styles.heroSub}>
              Add medications and set alarms to get started.
            </Text>
            <Pressable
              style={styles.heroBtn}
              onPress={() => router.navigate('/(tabs)/meds')}
            >
              <Text style={styles.heroBtnText}>Add Medication →</Text>
            </Pressable>
            <View style={styles.heroBlur} />
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💊</Text>
            <Text style={styles.statValue}>{medications.length}</Text>
            <Text style={styles.statLabel}>Medications</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⏰</Text>
            <Text style={styles.statValue}>{alarms.length}</Text>
            <Text style={styles.statLabel}>Alarms</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>👤</Text>
            <Text style={styles.statValue}>{profile?.gender?.[0] || '—'}</Text>
            <Text style={styles.statLabel}>Gender</Text>
          </View>
        </View>

        {/* My Medications List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Medications</Text>
        </View>

        {medications.map((p) => (
          <View key={p.id} style={styles.routineCard}>
            <View style={[styles.routineIcon, { backgroundColor: Brand.blue50 }]}>
              <Text style={{ fontSize: 18 }}>💊</Text>
            </View>
            <View style={styles.routineInfo}>
              <Text style={styles.routineName}>{p.name}</Text>
              <Text style={styles.routineStatus}>
                {[p.dosage, `${p.frequency}x daily`].filter(Boolean).join(' · ') || 'No details'}
              </Text>
            </View>
          </View>
        ))}

        {medications.length === 0 && (
          <Text style={styles.emptyText}>No medications added yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Brand.emerald800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.white,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.slate400,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.slate800,
    marginTop: 1,
  },
  logoutRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: Brand.emerald500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.emerald700,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  // Hero
  heroCard: {
    backgroundColor: Brand.emerald800,
    borderRadius: 28,
    padding: 24,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: Brand.emerald900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.white,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Brand.white,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    color: Brand.emerald200,
    marginTop: 4,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  timeBox: {
    backgroundColor: 'rgba(4,120,87,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.emerald200,
    textTransform: 'uppercase',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Brand.white,
  },
  heroBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  heroBtnText: {
    color: Brand.white,
    fontSize: 14,
    fontWeight: '700',
  },
  heroBlur: {
    position: 'absolute',
    right: -32,
    bottom: -32,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(4,120,87,0.4)',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Brand.slate50,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.slate100,
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.slate800,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.slate800,
  },
  // Routine cards
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: Brand.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Brand.slate100,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  routineIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.slate800,
  },
  routineStatus: {
    fontSize: 10,
    fontWeight: '500',
    color: Brand.slate400,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: Brand.slate400,
    fontSize: 14,
  },
});
