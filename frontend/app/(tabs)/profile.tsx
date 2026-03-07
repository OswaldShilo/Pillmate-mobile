import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Brand } from '@/constants/theme';
import { api } from '../../services/axiosApi';
import { cacheProfile, getCachedProfile, clearAllCache } from '../../services/localCache';

const GENDER_OPTIONS = ['Male', 'Female', 'Others'] as const;

export default function ProfileTab() {
  const [profile, setProfile] = useState<any>(null);
  const [medCount, setMedCount] = useState(0);
  const [alarmCount, setAlarmCount] = useState(0);
  const [doseCount, setDoseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    setLoading(true);
    try {
      const cached = await getCachedProfile();
      if (cached) setProfile(cached);

      const [profileRes, medsRes, alarmsRes, dosesRes] = await Promise.all([
        api.get('/auth/profile'),
        api.get('/prescriptions'),
        api.get('/alarms'),
        api.get('/doses'),
      ]);
      setProfile(profileRes.data);
      setMedCount(medsRes.data.length);
      setAlarmCount(alarmsRes.data.length);
      setDoseCount(dosesRes.data.length);
      await cacheProfile(profileRes.data);
    } catch (e: any) {
      if (e.response?.status === 401) {
        await SecureStore.deleteItemAsync('userToken');
        router.replace('/auth');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await SecureStore.deleteItemAsync('userToken');
    await clearAllCache();
    router.replace('/auth');
  }

  function openEdit() {
    setEditAge(profile?.age?.toString() || '');
    setEditGender(profile?.gender || '');
    setShowEdit(true);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', {
        age: editAge ? parseInt(editAge) : null,
        gender: editGender || null,
      });
      setProfile(res.data);
      await cacheProfile(res.data);
      setShowEdit(false);
    } catch (e: any) {
      let msg = e.response?.data?.detail || e.message;
      if (Array.isArray(msg)) msg = msg.map((x: any) => x.msg).join('\n');
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Brand.emerald500} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gradient Header */}
        <View style={styles.gradientHeader}>
          <View style={styles.gradientBg}>
            <View style={styles.gradientCircle1} />
            <View style={styles.gradientCircle2} />
          </View>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>{profile?.username || 'User'}</Text>
          <View style={styles.memberBadge}>
            <Ionicons name="shield-checkmark" size={12} color={Brand.emerald600} />
            <Text style={styles.memberText}>Member</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{medCount}</Text>
            <Text style={styles.statLabel}>Meds</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={[styles.statValue, { color: Brand.white }]}>{alarmCount}</Text>
            <Text style={[styles.statLabel, { color: Brand.emerald200 }]}>Alarms</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{doseCount}</Text>
            <Text style={styles.statLabel}>Doses</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Ionicons name="person-outline" size={18} color={Brand.emerald700} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>{profile?.username || '—'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Ionicons name="calendar-outline" size={18} color={Brand.emerald700} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>{profile?.age ?? '—'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Ionicons name="male-female-outline" size={18} color={Brand.emerald700} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{profile?.gender || '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
            onPress={openEdit}
          >
            <View style={[styles.infoIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="create-outline" size={18} color="#6366F1" />
            </View>
            <Text style={styles.actionText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={Brand.slate300} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
            onPress={handleLogout}
          >
            <View style={[styles.infoIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={18} color={Brand.slate300} />
          </Pressable>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEdit} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowEdit(false)}>
          <Pressable style={styles.modalCard} onPress={() => { }}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="Your age"
              placeholderTextColor={Brand.slate400}
              value={editAge}
              onChangeText={setEditAge}
              keyboardType="numeric"
              maxLength={3}
            />

            <Text style={styles.fieldLabel}>Gender</Text>
            <Pressable
              style={[styles.input, styles.dropdown]}
              onPress={() => setShowGenderPicker(true)}
            >
              <Text style={editGender ? styles.dropdownText : styles.dropdownPlaceholder}>
                {editGender || 'Select gender'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </Pressable>

            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={saveProfile}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Gender Picker */}
      <Modal visible={showGenderPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowGenderPicker(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Select Gender</Text>
            {GENDER_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.pickerOption, editGender === opt && styles.pickerOptionSelected]}
                onPress={() => { setEditGender(opt); setShowGenderPicker(false); }}
              >
                <Text style={[styles.pickerOptionText, editGender === opt && styles.pickerOptionTextSel]}>
                  {opt}
                </Text>
                {editGender === opt && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.white },
  // Gradient header
  gradientHeader: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Brand.emerald800,
  },
  gradientCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16,185,129,0.3)',
    top: -40,
    right: -60,
  },
  gradientCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(5,150,105,0.4)',
    bottom: -30,
    left: -40,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: Brand.white },
  name: { fontSize: 22, fontWeight: '800', color: Brand.white, marginBottom: 6 },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  memberText: { fontSize: 12, fontWeight: '600', color: Brand.emerald200 },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Brand.white,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardAccent: {
    backgroundColor: Brand.emerald800,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: Brand.slate800 },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  // Section
  section: {
    marginHorizontal: 20,
    backgroundColor: Brand.white,
    borderRadius: 22,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: Brand.slate100,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  infoList: {},
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Brand.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: Brand.slate400 },
  infoValue: { fontSize: 15, fontWeight: '700', color: Brand.slate800, marginTop: 1 },
  divider: { height: 1, backgroundColor: Brand.slate50, marginHorizontal: 14 },
  // Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  actionText: { flex: 1, fontSize: 15, fontWeight: '600', color: Brand.slate800 },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Brand.white,
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Brand.slate800, marginBottom: 20, textAlign: 'center' },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.slate500,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Brand.slate50,
    borderWidth: 1,
    borderColor: Brand.slate200,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 16,
    color: Brand.slate800,
    marginBottom: 16,
  },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { fontSize: 16, color: Brand.slate800 },
  dropdownPlaceholder: { fontSize: 16, color: Brand.slate400 },
  dropdownArrow: { fontSize: 10, color: Brand.slate400 },
  saveBtn: {
    backgroundColor: Brand.emerald800,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: Brand.white, fontSize: 16, fontWeight: '700' },
  // Picker
  pickerCard: {
    backgroundColor: Brand.white,
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: Brand.slate800, marginBottom: 16, textAlign: 'center' },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 4,
  },
  pickerOptionSelected: { backgroundColor: Brand.emerald50 },
  pickerOptionText: { fontSize: 16, color: Brand.slate800, fontWeight: '500' },
  pickerOptionTextSel: { color: Brand.emerald800, fontWeight: '700' },
  checkmark: { fontSize: 16, color: Brand.emerald800, fontWeight: '800' },
});
