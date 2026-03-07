import { Ionicons } from '@expo/vector-icons';
import notifee, { EventType } from '@notifee/react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  cancelReminder, scheduleReminder,
} from '@/services/notifications';

// ── Colors ────────────────────────────────────────────────────────────────────
const MED_COLORS = [
  { bg: '#EFF6FF', accent: '#3B82F6' },
  { bg: '#F0FDF4', accent: '#22C55E' },
  { bg: '#FEF3C7', accent: '#F59E0B' },
  { bg: '#FDF2F8', accent: '#EC4899' },
  { bg: '#EDE9FE', accent: '#8B5CF6' },
  { bg: '#FFF7ED', accent: '#F97316' },
];
function medColor(id: number) { return MED_COLORS[id % MED_COLORS.length]; }

// ── Clock Picker ──────────────────────────────────────────────────────────────
function ClockPicker({ hour, minute, onH, onM }: { hour: number; minute: number; onH: (h: number) => void; onM: (m: number) => void }) {
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const fmt = (h: number) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
  return (
    <View style={{ gap: 14 }}>
      <View style={ck.face}>
        <Text style={ck.time}>{String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}</Text>
        <Text style={ck.ampm}>{hour >= 12 ? 'PM' : 'AM'}</Text>
      </View>
      <View>
        <Text style={ck.label}>HOUR</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ck.row}>
          {HOURS.map(h => <Pressable key={h} style={[ck.chip, hour === h && ck.sel]} onPress={() => onH(h)}><Text style={[ck.chipTxt, hour === h && ck.selTxt]}>{fmt(h)}</Text></Pressable>)}
        </ScrollView>
      </View>
      <View>
        <Text style={ck.label}>MINUTE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ck.row}>
          {MINS.map(m => <Pressable key={m} style={[ck.chip, minute === m && ck.sel]} onPress={() => onM(m)}><Text style={[ck.chipTxt, minute === m && ck.selTxt]}>{String(m).padStart(2, '0')}</Text></Pressable>)}
        </ScrollView>
      </View>
    </View>
  );
}
const ck = StyleSheet.create({
  face: { alignSelf: 'center', backgroundColor: Brand.slate800, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 30, alignItems: 'center' },
  time: { fontSize: 36, fontWeight: '900', color: Brand.white, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  ampm: { fontSize: 12, fontWeight: '700', color: Brand.emerald300, marginTop: 2 },
  label: { fontSize: 10, fontWeight: '700', color: Brand.slate400, letterSpacing: 1, paddingHorizontal: 4, marginBottom: 6 },
  row: { gap: 6, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: Brand.slate50, borderWidth: 1.5, borderColor: Brand.slate100 },
  sel: { backgroundColor: Brand.emerald800, borderColor: Brand.emerald800 },
  chipTxt: { fontSize: 12, fontWeight: '700', color: Brand.slate500 },
  selTxt: { color: Brand.white },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function VaultTab() {
  const [tab, setTab] = useState<'meds' | 'rx'>('meds');
  const [medications, setMedications] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add medication
  const [showAddMed, setShowAddMed] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFreq, setMedFreq] = useState('1');
  const [medImage, setMedImage] = useState('');
  const [saving, setSaving] = useState(false);

  // Add prescription
  const [showAddRx, setShowAddRx] = useState(false);
  const [rxDoctor, setRxDoctor] = useState('');
  const [rxDate, setRxDate] = useState('');
  const [rxNotes, setRxNotes] = useState('');
  const [rxImage, setRxImage] = useState('');

  // Clock alarm
  const [showClock, setShowClock] = useState(false);
  const [clockMed, setClockMed] = useState<any>(null);
  const [clockH, setClockH] = useState(8);
  const [clockM, setClockM] = useState(0);

  // Detail
  const [detailMed, setDetailMed] = useState<any>(null);

  useFocusEffect(useCallback(() => { loadData(); }, []));
  useEffect(() => notifee.onForegroundEvent(({ type }) => {
    if (type === EventType.PRESS || type === EventType.DISMISSED) loadData();
  }), []);

  async function loadData() {
    setLoading(true);
    try {
      const [medsRes, rxRes, alarmsRes] = await Promise.all([
        api.get('/medications'), api.get('/prescriptions'), api.get('/alarms'),
      ]);
      setMedications(medsRes.data);
      setPrescriptions(rxRes.data);
      setAlarms(alarmsRes.data);
    } catch (e: any) {
      if (e.response?.status === 401) { await SecureStore.deleteItemAsync('userToken'); router.replace('/auth'); }
    } finally { setLoading(false); }
  }

  // ── Image picker ────────────────────────────────────────────────────────────
  async function pickImage(setter: (uri: string) => void) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled && result.assets[0]) setter(result.assets[0].uri);
  }

  async function takePhoto(setter: (uri: string) => void) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0]) setter(result.assets[0].uri);
  }

  // ── Add Medication ──────────────────────────────────────────────────────────
  function openAddMed() { setMedName(''); setMedDosage(''); setMedFreq('1'); setMedImage(''); setShowAddMed(true); }

  async function handleAddMed() {
    if (!medName.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/medications', {
        name: medName.trim(), dosage: medDosage.trim(),
        frequency: parseInt(medFreq) || 1, image_uri: medImage,
      });
      setMedications(prev => [res.data, ...prev]);
      setShowAddMed(false);
      // Ask to set alarm via bottom sheet
      setClockMed(res.data); setClockH(8); setClockM(0); setShowClock(true);
    } catch (e: any) {
      let msg = e.response?.data?.detail || e.message;
      if (Array.isArray(msg)) msg = msg.map((x: any) => x.msg).join('\n');
      Alert.alert('Error', String(msg));
    } finally { setSaving(false); }
  }

  // ── Add Prescription ────────────────────────────────────────────────────────
  function openAddRx() { setRxDoctor(''); setRxDate(''); setRxNotes(''); setRxImage(''); setShowAddRx(true); }

  async function handleAddRx() {
    setSaving(true);
    try {
      const res = await api.post('/prescriptions', {
        image_uri: rxImage, doctor_name: rxDoctor.trim(),
        visit_date: rxDate.trim(), notes: rxNotes.trim(),
      });
      setPrescriptions(prev => [res.data, ...prev]);
      setShowAddRx(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function deleteMed(med: any) {
    try { await api.delete(`/medications/${med.id}`); await cancelReminder(String(med.id)); setDetailMed(null); await loadData(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  }

  async function deleteRx(rx: any) {
    try { await api.delete(`/prescriptions/${rx.id}`); await loadData(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  }

  // ── Set Alarm ───────────────────────────────────────────────────────────────
  function openClock(med: any) { setClockMed(med); setClockH(8); setClockM(0); setShowClock(true); }

  async function handleSetAlarm() {
    if (!clockMed) return;
    setSaving(true);
    try {
      const t = `${String(clockH).padStart(2, '0')}:${String(clockM).padStart(2, '0')}`;
      await api.post('/alarms', { medication_id: clockMed.id, time: t, label: clockMed.name, enabled: true });
      let slot: 'morning' | 'afternoon' | 'night' = 'morning';
      if (clockH >= 12 && clockH < 17) slot = 'afternoon';
      else if (clockH >= 17) slot = 'night';
      await scheduleReminder({
        medicationId: String(clockMed.id), medicationName: clockMed.name,
        dosage: clockMed.dosage || '', timing: [slot],
        customTimes: { [slot]: { hour: clockH, minute: clockM } },
      });
      setShowClock(false);
      await loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  }

  if (loading && medications.length === 0 && prescriptions.length === 0) {
    return <View style={[s.c, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Brand.emerald500} /></View>;
  }

  return (
    <View style={s.c}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.heading}>Vault</Text>
        <Pressable style={s.addBtn} onPress={tab === 'meds' ? openAddMed : openAddRx}>
          <Ionicons name="add" size={22} color={Brand.white} />
        </Pressable>
      </View>

      {/* Tab switcher */}
      <View style={s.tabRow}>
        <Pressable style={[s.tab, tab === 'meds' && s.tabSel]} onPress={() => setTab('meds')}>
          <Text style={[s.tabTxt, tab === 'meds' && s.tabTxtSel]}>Medications</Text>
        </Pressable>
        <Pressable style={[s.tab, tab === 'rx' && s.tabSel]} onPress={() => setTab('rx')}>
          <Text style={[s.tabTxt, tab === 'rx' && s.tabTxtSel]}>Prescriptions</Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {tab === 'meds' ? (
          medications.length > 0 ? medications.map(med => {
            const c = medColor(med.id);
            const medAlarms = alarms.filter((a: any) => a.medication_id === med.id);
            return (
              <Pressable key={med.id} style={[s.card, { backgroundColor: c.bg }]} onPress={() => setDetailMed(med)}>
                <View style={[s.cardIcon, { backgroundColor: `${c.accent}20` }]}>
                  {med.image_uri ? <Image source={{ uri: med.image_uri }} style={s.cardImg} /> : <Text style={{ fontSize: 26 }}>💊</Text>}
                </View>
                <View style={s.cardBody}>
                  <Text style={[s.cardName, { color: c.accent }]}>{med.name}</Text>
                  <Text style={s.cardSub}>{med.dosage || '—'} · {med.frequency}x daily</Text>
                  {medAlarms.length > 0 && (
                    <View style={s.chipRow}>{medAlarms.map((a: any) => <View key={a.id} style={s.alarmChip}><Text style={s.alarmChipTxt}>{a.time}</Text></View>)}</View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Brand.slate300} />
              </Pressable>
            );
          }) : <EmptyState emoji="💊" title="No medications" desc="Tap + to add a medicine." />
        ) : (
          prescriptions.length > 0 ? prescriptions.map(rx => (
            <View key={rx.id} style={s.rxCard}>
              {rx.image_uri ? <Image source={{ uri: rx.image_uri }} style={s.rxImg} /> : (
                <View style={s.rxImgPlaceholder}><Ionicons name="document-text-outline" size={32} color={Brand.slate300} /></View>
              )}
              <View style={s.rxBody}>
                <Text style={s.rxDoctor}>{rx.doctor_name || 'Doctor visit'}</Text>
                <Text style={s.rxDate}>{rx.visit_date || 'No date'}</Text>
                {rx.notes ? <Text style={s.rxNotes} numberOfLines={2}>{rx.notes}</Text> : null}
              </View>
              <Pressable onPress={() => deleteRx(rx)} hitSlop={10}><Ionicons name="trash-outline" size={18} color="#EF4444" /></Pressable>
            </View>
          )) : <EmptyState emoji="📋" title="No prescriptions" desc="Tap + to add a doctor visit record." />
        )}
      </ScrollView>

      {/* ── Add Medication (bottom sheet) ──────────────────────────── */}
      <Modal visible={showAddMed} animationType="slide" transparent>
        <View style={s.bottomSheet}>
          <View style={s.bsCard}>
            <View style={s.bsHandle} />
            <View style={s.bsHeader}>
              <Pressable onPress={() => setShowAddMed(false)}><Ionicons name="close" size={24} color={Brand.slate800} /></Pressable>
              <Text style={s.bsTitle}>Add Medication</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={s.bsBody} showsVerticalScrollIndicator={false}>
              {/* Optional image */}
              <Pressable style={s.imgPicker} onPress={() => pickImage(setMedImage)}>
                {medImage ? <Image source={{ uri: medImage }} style={s.imgPreview} /> : <Ionicons name="image-outline" size={24} color={Brand.slate400} />}
                <Text style={s.imgPickerTxt}>{medImage ? 'Change' : 'Image (optional)'}</Text>
              </Pressable>

              <Text style={s.fl}>Name *</Text>
              <TextInput style={s.fi} placeholder="e.g. Paracetamol" placeholderTextColor={Brand.slate400} value={medName} onChangeText={setMedName} />

              <Text style={s.fl}>Dosage</Text>
              <TextInput style={s.fi} placeholder="e.g. 500mg" placeholderTextColor={Brand.slate400} value={medDosage} onChangeText={setMedDosage} />

              <Text style={s.fl}>Frequency (times per day)</Text>
              <TextInput style={s.fi} placeholder="1" placeholderTextColor={Brand.slate400} value={medFreq} onChangeText={setMedFreq} keyboardType="number-pad" maxLength={2} />
            </ScrollView>
            <View style={s.bsFooter}>
              <Pressable style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleAddMed} disabled={saving}>
                <Text style={s.saveTxt}>{saving ? 'Saving...' : 'Save & Set Alarm'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Prescription (bottom sheet) ────────────────────────── */}
      <Modal visible={showAddRx} animationType="slide" transparent>
        <View style={s.bottomSheet}>
          <View style={s.bsCard}>
            <View style={s.bsHandle} />
            <View style={s.bsHeader}>
              <Pressable onPress={() => setShowAddRx(false)}><Ionicons name="close" size={24} color={Brand.slate800} /></Pressable>
              <Text style={s.bsTitle}>Add Prescription</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={s.bsBody} showsVerticalScrollIndicator={false}>
              <Pressable style={s.rxImgUploaderBox} onPress={() => {
                // Bottom sheet style choice
                Alert.alert('Add Image', '', [
                  { text: 'Camera', onPress: () => takePhoto(setRxImage) },
                  { text: 'Gallery', onPress: () => pickImage(setRxImage) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}>
                {rxImage ? <Image source={{ uri: rxImage }} style={s.rxImgFull} /> : (
                  <>
                    <Ionicons name="camera-outline" size={32} color={Brand.slate400} />
                    <Text style={s.rxImgUpTxt}>Take photo or select from gallery</Text>
                  </>
                )}
              </Pressable>

              <Text style={s.fl}>Doctor Name</Text>
              <TextInput style={s.fi} placeholder="Dr. Smith" placeholderTextColor={Brand.slate400} value={rxDoctor} onChangeText={setRxDoctor} />

              <Text style={s.fl}>Visit Date</Text>
              <TextInput style={s.fi} placeholder="e.g. 2026-03-08" placeholderTextColor={Brand.slate400} value={rxDate} onChangeText={setRxDate} />

              <Text style={s.fl}>Notes</Text>
              <TextInput style={[s.fi, { height: 90, textAlignVertical: 'top' }]} placeholder="Any notes about this visit..." placeholderTextColor={Brand.slate400} value={rxNotes} onChangeText={setRxNotes} multiline />
            </ScrollView>
            <View style={s.bsFooter}>
              <Pressable style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleAddRx} disabled={saving}>
                <Text style={s.saveTxt}>{saving ? 'Saving...' : 'Save Prescription'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Medication Detail (bottom sheet) ───────────────────────── */}
      <Modal visible={!!detailMed} animationType="slide" transparent>
        <View style={s.bottomSheet}>
          <View style={s.bsCard}>
            <View style={s.bsHandle} />
            {detailMed && (() => {
              const c = medColor(detailMed.id);
              const ma = alarms.filter((a: any) => a.medication_id === detailMed.id);
              return (
                <ScrollView contentContainerStyle={s.bsBody}>
                  <View style={[s.detailHero, { backgroundColor: c.bg }]}>
                    {detailMed.image_uri ? <Image source={{ uri: detailMed.image_uri }} style={s.detailHeroImg} /> : <Text style={{ fontSize: 44 }}>💊</Text>}
                  </View>
                  <Text style={s.detailName}>{detailMed.name}</Text>
                  <View style={s.detailInfo}>
                    <Row label="ID" value={`#${detailMed.id}`} />
                    <Row label="Dosage" value={detailMed.dosage || '—'} />
                    <Row label="Frequency" value={`${detailMed.frequency}x daily`} />
                    <Row label="Added" value={detailMed.created_at ? new Date(detailMed.created_at).toLocaleDateString() : '—'} />
                  </View>
                  {ma.length > 0 && (
                    <View style={s.detailAlarms}>
                      <Text style={s.detailAlarmsTitle}>⏰ Alarms</Text>
                      {ma.map((a: any) => <Text key={a.id} style={s.detailAlarmTime}>{a.time} · Daily</Text>)}
                    </View>
                  )}
                  <View style={s.detailActions}>
                    <Pressable style={s.actGreen} onPress={() => { setDetailMed(null); openClock(detailMed); }}>
                      <Ionicons name="alarm-outline" size={16} color={Brand.emerald800} /><Text style={s.actGreenTxt}>Add Alarm</Text>
                    </Pressable>
                    <Pressable style={s.actRed} onPress={() => deleteMed(detailMed)}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" /><Text style={s.actRedTxt}>Delete</Text>
                    </Pressable>
                  </View>
                  <Pressable style={s.closeDetailBtn} onPress={() => setDetailMed(null)}><Text style={s.closeDetailTxt}>Close</Text></Pressable>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Clock Alarm (bottom sheet) ─────────────────────────────── */}
      <Modal visible={showClock} animationType="slide" transparent>
        <View style={s.bottomSheet}>
          <View style={s.bsCard}>
            <View style={s.bsHandle} />
            <View style={s.bsHeader}>
              <Pressable onPress={() => setShowClock(false)}><Ionicons name="close" size={24} color={Brand.slate800} /></Pressable>
              <Text style={s.bsTitle}>Set Alarm</Text>
              <View style={{ width: 24 }} />
            </View>
            <Text style={s.bsSubtitle}>{clockMed?.name}</Text>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <ClockPicker hour={clockH} minute={clockM} onH={setClockH} onM={setClockM} />
            </View>
            <View style={s.bsFooter}>
              <Pressable style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSetAlarm} disabled={saving}>
                <Text style={s.saveTxt}>{saving ? 'Setting...' : 'Set Alarm'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return <View style={s.row}><Text style={s.rowL}>{label}</Text><Text style={s.rowV}>{value}</Text></View>;
}
function EmptyState({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</Text><Text style={s.emptyT}>{title}</Text><Text style={s.emptyD}>{desc}</Text></View>;
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: Brand.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 10,
  },
  heading: { fontSize: 24, fontWeight: '800', color: Brand.slate800 },
  addBtn: {
    width: 44, height: 44, borderRadius: 16, backgroundColor: Brand.emerald800,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Brand.emerald900, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: Brand.slate100, borderRadius: 14, padding: 3, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabSel: { backgroundColor: Brand.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabTxt: { fontSize: 13, fontWeight: '600', color: Brand.slate400 },
  tabTxtSel: { color: Brand.emerald800, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 120, gap: 10 },
  // Med card
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, gap: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  cardIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardImg: { width: 52, height: 52, borderRadius: 16 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '800' },
  cardSub: { fontSize: 12, color: Brand.slate500, marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  alarmChip: { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  alarmChipTxt: { fontSize: 10, fontWeight: '700', color: Brand.slate600 },
  // Rx card
  rxCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, gap: 14, backgroundColor: Brand.slate50, borderWidth: 1, borderColor: Brand.slate100 },
  rxImg: { width: 60, height: 60, borderRadius: 14 },
  rxImgPlaceholder: { width: 60, height: 60, borderRadius: 14, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Brand.slate200 },
  rxBody: { flex: 1 },
  rxDoctor: { fontSize: 15, fontWeight: '700', color: Brand.slate800 },
  rxDate: { fontSize: 12, color: Brand.slate400, marginTop: 2 },
  rxNotes: { fontSize: 11, color: Brand.slate500, marginTop: 4 },
  // Empty
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyT: { fontSize: 16, fontWeight: '700', color: Brand.slate500 },
  emptyD: { fontSize: 13, color: Brand.slate400, textAlign: 'center', marginTop: 4 },
  // Bottom sheet
  bottomSheet: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  bsCard: { backgroundColor: Brand.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  bsHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Brand.slate300, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  bsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Brand.slate100 },
  bsTitle: { fontSize: 17, fontWeight: '700', color: Brand.slate800 },
  bsSubtitle: { fontSize: 13, color: Brand.slate400, textAlign: 'center', paddingVertical: 8 },
  bsBody: { padding: 24, gap: 16 },
  bsFooter: { padding: 20, borderTopWidth: 1, borderTopColor: Brand.slate100 },
  // Form
  fl: { fontSize: 12, fontWeight: '700', color: Brand.slate500, textTransform: 'uppercase', letterSpacing: 0.5 },
  fi: { backgroundColor: Brand.slate50, borderWidth: 1, borderColor: Brand.slate200, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, fontSize: 16, color: Brand.slate800 },
  saveBtn: { backgroundColor: Brand.emerald800, paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: Brand.emerald900, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  saveTxt: { color: Brand.white, fontSize: 16, fontWeight: '700' },
  // Image pickers
  imgPicker: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Brand.slate50, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Brand.slate200 },
  imgPreview: { width: 48, height: 48, borderRadius: 12 },
  imgPickerTxt: { fontSize: 14, fontWeight: '600', color: Brand.slate500 },
  rxImgUploaderBox: { alignItems: 'center', paddingVertical: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: Brand.slate200, borderRadius: 20, backgroundColor: Brand.slate50 },
  rxImgFull: { width: '100%', height: 180, borderRadius: 16 },
  rxImgUpTxt: { fontSize: 13, fontWeight: '600', color: Brand.slate400, marginTop: 10 },
  // Detail
  detailHero: { alignSelf: 'center', width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  detailHeroImg: { width: 100, height: 100 },
  detailName: { fontSize: 22, fontWeight: '800', color: Brand.slate800, textAlign: 'center', marginBottom: 16 },
  detailInfo: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Brand.slate50 },
  rowL: { fontSize: 12, fontWeight: '700', color: Brand.slate400, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowV: { fontSize: 14, fontWeight: '600', color: Brand.slate800 },
  detailAlarms: { marginTop: 14, backgroundColor: Brand.slate50, borderRadius: 14, padding: 14 },
  detailAlarmsTitle: { fontSize: 12, fontWeight: '700', color: Brand.slate500, marginBottom: 8 },
  detailAlarmTime: { fontSize: 14, fontWeight: '700', color: Brand.slate800, paddingVertical: 3 },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actGreen: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, backgroundColor: Brand.emerald50, borderRadius: 14, borderWidth: 1, borderColor: Brand.emerald200 },
  actGreenTxt: { fontSize: 13, fontWeight: '700', color: Brand.emerald800 },
  actRed: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, backgroundColor: '#FEF2F2', borderRadius: 14, borderWidth: 1, borderColor: '#FECACA' },
  actRedTxt: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  closeDetailBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 10 },
  closeDetailTxt: { fontSize: 15, fontWeight: '600', color: Brand.slate400 },
});
