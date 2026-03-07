import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
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
    View,
} from 'react-native';

import { Brand } from '@/constants/theme';
import { api } from '../../services/axiosApi';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SLOT_COLORS = [
    { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' },
    { bg: '#DCF4E8', text: '#059669', border: '#6EE7B7' },
    { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
    { bg: '#EDE9FE', text: '#7C3AED', border: '#C4B5FD' },
    { bg: '#FCE7F3', text: '#DB2777', border: '#F9A8D4' },
    { bg: '#FFEDD5', text: '#EA580C', border: '#FDBA74' },
];
function slotColor(i: number) { return SLOT_COLORS[i % SLOT_COLORS.length]; }

// Default time slots based on frequency
function getDefaultTimes(freq: number): string[] {
    if (freq === 1) return ['08:00'];
    if (freq === 2) return ['08:00', '20:00'];
    if (freq === 3) return ['08:00', '14:00', '20:00'];
    if (freq === 4) return ['06:00', '12:00', '18:00', '22:00'];
    // For higher, spread evenly
    const times: string[] = [];
    const interval = Math.floor(24 / freq);
    for (let i = 0; i < freq; i++) {
        const h = (6 + i * interval) % 24;
        times.push(`${String(h).padStart(2, '0')}:00`);
    }
    return times;
}

export default function CalendarTab() {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState(today.getDate());
    const [doses, setDoses] = useState<any[]>([]);
    const [medications, setMedications] = useState<any[]>([]);
    const [alarms, setAlarms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => { loadData(); }, [currentYear, currentMonth, selectedDate])
    );

    async function loadData() {
        setLoading(true);
        try {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
            const [dosesRes, medsRes, alarmsRes] = await Promise.all([
                api.get(`/doses?date=${dateStr}`),
                api.get('/medications'),
                api.get('/alarms'),
            ]);
            setDoses(dosesRes.data);
            setMedications(medsRes.data);
            setAlarms(alarmsRes.data);
        } catch (e: any) {
            if (e.response?.status === 401) { await SecureStore.deleteItemAsync('userToken'); router.replace('/auth'); }
        } finally { setLoading(false); }
    }

    async function logDose(medicationId: number, status: string) {
        try { await api.post('/doses', { medication_id: medicationId, status }); await loadData(); }
        catch (e: any) { Alert.alert('Error', e.message); }
    }

    // Week strip
    function getWeekDays() {
        const days: { date: number; dayName: string; month: number; year: number; isToday: boolean; isSelected: boolean }[] = [];
        const start = new Date(currentYear, currentMonth, selectedDate - 3);
        for (let i = 0; i < 7; i++) {
            const d = new Date(start); d.setDate(start.getDate() + i);
            days.push({
                date: d.getDate(), dayName: WEEKDAYS[d.getDay()],
                month: d.getMonth(), year: d.getFullYear(),
                isToday: d.toDateString() === today.toDateString(),
                isSelected: d.getDate() === selectedDate && d.getMonth() === currentMonth && d.getFullYear() === currentYear,
            });
        }
        return days;
    }

    function navigateDay(day: { date: number; month: number; year: number }) {
        setCurrentMonth(day.month); setCurrentYear(day.year); setSelectedDate(day.date);
    }

    function navigateMonth(offset: number) {
        let m = currentMonth + offset; let y = currentYear;
        if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
        setCurrentMonth(m); setCurrentYear(y); setSelectedDate(1);
    }

    const isToday = selectedDate === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    const weekDays = getWeekDays();

    // ── Build schedule: each medication × frequency entries ──────────────────
    const schedule: { medId: number; medName: string; dosage: string; time: string; colorIdx: number; taken: boolean }[] = [];

    medications.forEach((med, medIdx) => {
        const medAlarms = alarms.filter((a: any) => a.medication_id === med.id);
        const freq = med.frequency || 1;
        const dosesForMed = doses.filter((d: any) => d.medication_id === med.id);

        if (medAlarms.length > 0) {
            // Use actual alarm times
            medAlarms.forEach((alarm: any, j: number) => {
                schedule.push({
                    medId: med.id, medName: med.name, dosage: med.dosage || '',
                    time: alarm.time, colorIdx: medIdx,
                    taken: dosesForMed.length > j,
                });
            });
            // If more frequency slots than alarms, fill with defaults
            if (freq > medAlarms.length) {
                const defaults = getDefaultTimes(freq);
                for (let i = medAlarms.length; i < freq; i++) {
                    schedule.push({
                        medId: med.id, medName: med.name, dosage: med.dosage || '',
                        time: defaults[i] || `${String(8 + i * 4).padStart(2, '0')}:00`,
                        colorIdx: medIdx,
                        taken: dosesForMed.length > i,
                    });
                }
            }
        } else {
            // No alarms set — use frequency-based default times
            const defaults = getDefaultTimes(freq);
            defaults.forEach((t, j) => {
                schedule.push({
                    medId: med.id, medName: med.name, dosage: med.dosage || '',
                    time: t, colorIdx: medIdx,
                    taken: dosesForMed.length > j,
                });
            });
        }
    });

    // Sort by time
    schedule.sort((a, b) => a.time.localeCompare(b.time));

    return (
        <View style={st.c}>
            {/* Top bar */}
            <View style={st.topBar}>
                <View>
                    <Text style={st.month}>{FULL_MONTHS[currentMonth]}</Text>
                    <Text style={st.year}>{currentYear}</Text>
                </View>
                <View style={st.navRow}>
                    <Pressable style={st.navBtn} onPress={() => navigateMonth(-1)}><Ionicons name="chevron-back" size={18} color={Brand.slate600} /></Pressable>
                    <Pressable style={st.todayBtn} onPress={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setSelectedDate(today.getDate()); }}>
                        <Text style={st.todayTxt}>Today</Text>
                    </Pressable>
                    <Pressable style={st.navBtn} onPress={() => navigateMonth(1)}><Ionicons name="chevron-forward" size={18} color={Brand.slate600} /></Pressable>
                </View>
            </View>

            {/* Week strip */}
            <View style={st.strip}>
                {weekDays.map((day, i) => (
                    <Pressable key={i} style={[st.wd, day.isSelected && st.wdSel, day.isToday && !day.isSelected && st.wdToday]} onPress={() => navigateDay(day)}>
                        <Text style={[st.wdLabel, day.isSelected && { color: Brand.white }]}>{day.dayName}</Text>
                        <Text style={[st.wdDate, day.isSelected && { color: Brand.white }, day.isToday && !day.isSelected && { color: Brand.emerald800 }]}>{day.date}</Text>
                        {day.isToday && <View style={[st.dot, day.isSelected && { backgroundColor: Brand.white }]} />}
                    </Pressable>
                ))}
            </View>

            {/* Day content */}
            <ScrollView style={st.dayScroll} showsVerticalScrollIndicator={false}>
                <View style={st.dayHead}>
                    <Text style={st.dayTitle}>{isToday ? 'Today' : `${FULL_MONTHS[currentMonth]} ${selectedDate}`}</Text>
                    <Text style={st.daySub}>{schedule.length} dose{schedule.length !== 1 ? 's' : ''}</Text>
                </View>

                {loading ? <ActivityIndicator size="small" color={Brand.emerald500} style={{ marginTop: 40 }} /> : schedule.length > 0 ? (
                    <View style={st.timeline}>
                        {schedule.map((item, i) => {
                            const c = slotColor(item.colorIdx);
                            const [h] = item.time.split(':').map(Number);
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            const hr = h % 12 || 12;
                            return (
                                <View key={`${item.medId}-${item.time}-${i}`} style={st.tRow}>
                                    <View style={st.tTime}>
                                        <Text style={st.tH}>{hr}</Text>
                                        <Text style={st.tAP}>{ampm}</Text>
                                    </View>
                                    <View style={st.tLine}>
                                        <View style={[st.tDot, { backgroundColor: c.text }]} />
                                        {i < schedule.length - 1 && <View style={[st.tBar, { backgroundColor: c.border }]} />}
                                    </View>
                                    <View style={[st.eventCard, { backgroundColor: c.bg, borderLeftColor: c.text }]}>
                                        <View style={st.eventTop}>
                                            <Text style={[st.eventName, { color: c.text }]}>{item.medName}</Text>
                                            {item.taken ? (
                                                <View style={[st.badge, { backgroundColor: '#D1FAE5' }]}>
                                                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                                                    <Text style={[st.badgeTxt, { color: '#059669' }]}>Taken</Text>
                                                </View>
                                            ) : isToday ? (
                                                <Pressable style={[st.badge, { backgroundColor: c.text }]} onPress={() => logDose(item.medId, 'taken')}>
                                                    <Ionicons name="add-circle" size={12} color="#fff" />
                                                    <Text style={[st.badgeTxt, { color: '#fff' }]}>Take</Text>
                                                </Pressable>
                                            ) : null}
                                        </View>
                                        <Text style={[st.eventDetail, { color: c.text }]}>{item.time} · {item.dosage || 'No dosage'}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View style={st.emptyDay}>
                        <View style={st.emptyIc}><Ionicons name="calendar-outline" size={32} color={Brand.slate300} /></View>
                        <Text style={st.emptyT}>No doses scheduled</Text>
                        <Text style={st.emptyD}>Add medications in the Vault tab.</Text>
                    </View>
                )}
                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const st = StyleSheet.create({
    c: { flex: 1, backgroundColor: Brand.white },
    topBar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16 },
    month: { fontSize: 24, fontWeight: '800', color: Brand.slate800 },
    year: { fontSize: 13, fontWeight: '600', color: Brand.slate400, marginTop: 1 },
    navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    navBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Brand.slate50, alignItems: 'center', justifyContent: 'center' },
    todayBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: Brand.emerald50, borderWidth: 1, borderColor: Brand.emerald200 },
    todayTxt: { fontSize: 12, fontWeight: '700', color: Brand.emerald800 },
    strip: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Brand.slate100, gap: 4 },
    wd: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 16 },
    wdSel: { backgroundColor: Brand.emerald800, shadowColor: Brand.emerald900, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    wdToday: { backgroundColor: Brand.emerald50 },
    wdLabel: { fontSize: 9, fontWeight: '700', color: Brand.slate400, letterSpacing: 0.5, marginBottom: 4 },
    wdDate: { fontSize: 16, fontWeight: '700', color: Brand.slate700 },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Brand.emerald500, marginTop: 4 },
    dayScroll: { flex: 1, paddingHorizontal: 24 },
    dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 16 },
    dayTitle: { fontSize: 18, fontWeight: '700', color: Brand.slate800 },
    daySub: { fontSize: 12, fontWeight: '600', color: Brand.slate400 },
    timeline: { gap: 4 },
    tRow: { flexDirection: 'row', minHeight: 80 },
    tTime: { width: 36, alignItems: 'center', paddingTop: 12 },
    tH: { fontSize: 16, fontWeight: '800', color: Brand.slate500 },
    tAP: { fontSize: 9, fontWeight: '700', color: Brand.slate400 },
    tLine: { width: 24, alignItems: 'center', paddingTop: 14 },
    tDot: { width: 10, height: 10, borderRadius: 5 },
    tBar: { width: 2, flex: 1, marginTop: 2 },
    eventCard: { flex: 1, borderRadius: 16, padding: 16, borderLeftWidth: 4, marginBottom: 8, marginLeft: 4 },
    eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    eventName: { fontSize: 15, fontWeight: '700', flex: 1 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeTxt: { fontSize: 11, fontWeight: '700' },
    eventDetail: { fontSize: 12, fontWeight: '500', opacity: 0.8 },
    emptyDay: { alignItems: 'center', paddingTop: 60 },
    emptyIc: { width: 64, height: 64, borderRadius: 20, backgroundColor: Brand.slate50, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    emptyT: { fontSize: 16, fontWeight: '700', color: Brand.slate500, marginBottom: 6 },
    emptyD: { fontSize: 13, color: Brand.slate400, textAlign: 'center', lineHeight: 20 },
});
