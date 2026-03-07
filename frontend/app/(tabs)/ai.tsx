import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import { Brand } from '@/constants/theme';
import type { AnalysisResult } from '@/services/api';
import { analyzePrescription, importMedications } from '@/services/api';
import { DEFAULT_TIMES, scheduleReminder } from '@/services/notifications';

type Phase = 'idle' | 'preview' | 'analyzing' | 'results' | 'importing' | 'done';

export default function ScanTab() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notifyFlags, setNotifyFlags] = useState<Record<number, boolean>>({});
  const [importCount, setImportCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);

  // ── Image picking ─────────────────────────────────────────────────────────

  async function pickImage(source: 'camera' | 'gallery') {
    const opts: ImagePicker.ImagePickerOptions = {
      quality: 0.8,
      base64: true,
      mediaTypes: ['images'],
    };

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera access is needed to scan prescriptions.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(opts);
    }

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
      setPhase('preview');
    }
  }

  // ── Analyze ───────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!imageBase64) return;
    setPhase('analyzing');
    try {
      const res = await analyzePrescription(imageBase64);
      setAnalysis(res);
      const indices = new Set(res.medications.map((_, i) => i));
      setSelected(indices);
      const flags: Record<number, boolean> = {};
      res.medications.forEach((_, i) => { flags[i] = true; });
      setNotifyFlags(flags);
      setPhase('results');
    } catch (err: any) {
      Alert.alert('Analysis Failed', err.message || 'Could not analyze prescription.');
      setPhase('preview');
    }
  }

  // ── Import & Schedule ─────────────────────────────────────────────────────

  async function handleImport() {
    if (!analysis) return;
    setPhase('importing');

    const picks = analysis.medications
      .map((med, i) => ({ med, i }))
      .filter(({ i }) => selected.has(i));

    // 1) Save to backend
    let serverMeds: any[] = [];
    try {
      serverMeds = await importMedications(picks.map(p => p.med));
    } catch {
      // Server save failed — continue with local notifications only
    }

    // 2) Schedule local notifications
    let scheduled = 0;
    for (let j = 0; j < picks.length; j++) {
      const { med, i } = picks[j];
      if (!notifyFlags[i] || med.timing.length === 0) continue;

      const medId = serverMeds[j]?.medication_id ?? `local-${Date.now()}-${j}`;
      const ids = await scheduleReminder({
        medicationId: medId,
        medicationName: med.name_english,
        dosage: med.dosage,
        timing: med.timing,
        withFood: med.with_food,
      });
      scheduled += ids.length;
    }

    setImportCount(picks.length);
    setReminderCount(scheduled);
    setPhase('done');
  }

  // ── Toggles ───────────────────────────────────────────────────────────────

  function toggleMed(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function toggleNotify(i: number) {
    setNotifyFlags(prev => ({ ...prev, [i]: !prev[i] }));
  }

  function reset() {
    setPhase('idle');
    setImageUri(null);
    setImageBase64(null);
    setAnalysis(null);
    setSelected(new Set());
    setNotifyFlags({});
  }

  // ── Loading states ────────────────────────────────────────────────────────

  if (phase === 'analyzing' || phase === 'importing') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Brand.emerald600} />
        <Text style={styles.loadingTitle}>
          {phase === 'analyzing' ? 'Analyzing Prescription…' : 'Importing Medications…'}
        </Text>
        <Text style={styles.loadingHint}>This may take a moment</Text>
      </View>
    );
  }

  // ── Done state ────────────────────────────────────────────────────────────

  if (phase === 'done') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.doneEmoji}>✅</Text>
        <Text style={styles.doneTitle}>Import Complete!</Text>
        <Text style={styles.doneDetail}>
          {importCount} medication{importCount !== 1 ? 's' : ''} imported
        </Text>
        <Text style={styles.doneDetail}>
          {reminderCount} reminder{reminderCount !== 1 ? 's' : ''} scheduled
        </Text>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => router.navigate('/(tabs)/meds')}
        >
          <Text style={styles.primaryBtnText}>View Medications</Text>
        </Pressable>

        <Pressable onPress={reset} style={styles.linkWrap}>
          <Text style={styles.linkText}>Scan Another Prescription</Text>
        </Pressable>
      </View>
    );
  }

  // ── Main scroll content ───────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Scan Prescription</Text>
          <Text style={styles.subtitle}>
            {phase === 'results'
              ? `${analysis!.medications.length} medication${analysis!.medications.length !== 1 ? 's' : ''} detected`
              : 'Upload a prescription to identify medications'}
          </Text>
        </View>

        {/* ── Idle: upload area ───────────────────────────────────────────── */}
        {phase === 'idle' && (
          <>
            <Pressable
              style={styles.uploadBox}
              onPress={() => pickImage('gallery')}
            >
              <Ionicons name="document-text-outline" size={44} color={Brand.slate300} />
              <Text style={styles.uploadLabel}>Select a prescription image</Text>
              <Text style={styles.uploadHint}>SUPPORTS JPG, PNG</Text>
            </Pressable>

            <View style={styles.btnRow}>
              <Pressable
                style={({ pressed }) => [styles.halfBtn, pressed && styles.pressed]}
                onPress={() => pickImage('camera')}
              >
                <Ionicons name="camera-outline" size={20} color={Brand.white} />
                <Text style={styles.halfBtnText}>Camera</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.halfBtn, styles.halfBtnAlt, pressed && styles.pressed]}
                onPress={() => pickImage('gallery')}
              >
                <Ionicons name="images-outline" size={20} color={Brand.emerald700} />
                <Text style={[styles.halfBtnText, { color: Brand.emerald700 }]}>Gallery</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── Preview: image + analyze button ─────────────────────────────── */}
        {phase === 'preview' && imageUri && (
          <>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />

            <Pressable onPress={reset} style={styles.linkWrap}>
              <Text style={styles.linkText}>Change Image</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={handleAnalyze}
            >
              <Ionicons name="sparkles" size={18} color={Brand.white} />
              <Text style={styles.primaryBtnText}>Analyze Prescription</Text>
            </Pressable>
          </>
        )}

        {/* ── Results: medication cards ────────────────────────────────────── */}
        {phase === 'results' && analysis && (
          <>
            {/* Language badge */}
            <View style={styles.langBadge}>
              <Text style={styles.langText}>
                🌐 Detected: {analysis.detected_language_name}
              </Text>
            </View>

            {/* Medication cards */}
            {analysis.medications.map((med, i) => (
              <Pressable
                key={i}
                style={[
                  styles.medCard,
                  !selected.has(i) && styles.medCardDeselected,
                ]}
                onPress={() => toggleMed(i)}
              >
                {/* Top row: checkbox + name + dosage */}
                <View style={styles.medTopRow}>
                  <View
                    style={[
                      styles.checkbox,
                      selected.has(i) && styles.checkboxChecked,
                    ]}
                  >
                    {selected.has(i) && (
                      <Ionicons name="checkmark" size={14} color={Brand.white} />
                    )}
                  </View>
                  <Text style={styles.medName}>{med.name_english}</Text>
                  {med.dosage ? (
                    <View style={styles.doseBadge}>
                      <Text style={styles.doseBadgeText}>{med.dosage}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Frequency */}
                <Text style={styles.medFreq}>{med.frequency}</Text>

                {/* Description */}
                {med.dicription ? (
                  <Text style={styles.medDesc}>{med.dicription}</Text>
                ) : null}

                {/* Importance */}
                {med.megication_importance ? (
                  <View style={styles.importanceBox}>
                    <Ionicons name="information-circle-outline" size={14} color={Brand.amber800} />
                    <Text style={styles.importanceText}>{med.megication_importance}</Text>
                  </View>
                ) : null}

                {/* Timing chips */}
                {med.timing.length > 0 && (
                  <View style={styles.timingRow}>
                    {med.timing.map(slot => (
                      <View key={slot} style={styles.timeChip}>
                        <Text style={styles.timeChipText}>
                          {slot === 'morning' ? '🌅' : slot === 'afternoon' ? '☀️' : '🌙'}{' '}
                          {DEFAULT_TIMES[slot]?.label ?? slot}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Notification toggle */}
                {selected.has(i) && med.timing.length > 0 && (
                  <View style={styles.notifyRow}>
                    <Ionicons name="notifications-outline" size={16} color={Brand.slate500} />
                    <Text style={styles.notifyLabel}>Reminders</Text>
                    <Switch
                      value={notifyFlags[i] ?? true}
                      onValueChange={() => toggleNotify(i)}
                      trackColor={{ false: Brand.slate200, true: Brand.emerald200 }}
                      thumbColor={notifyFlags[i] ? Brand.emerald600 : Brand.slate400}
                    />
                  </View>
                )}
              </Pressable>
            ))}

            {/* Import button */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                !selected.size && styles.primaryBtnDisabled,
                pressed && selected.size > 0 && styles.pressed,
              ]}
              onPress={handleImport}
              disabled={!selected.size}
            >
              <Text style={styles.primaryBtnText}>
                Import & Schedule ({selected.size})
              </Text>
            </Pressable>

            <Pressable onPress={reset} style={styles.linkWrap}>
              <Text style={styles.linkText}>Scan Another</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.white,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: Brand.slate800,
  },
  subtitle: {
    fontSize: 14,
    color: Brand.slate500,
    marginTop: 4,
  },

  // Upload box
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Brand.slate200,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: Brand.slate50,
    marginBottom: 20,
  },
  uploadLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.slate500,
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 10,
    color: Brand.slate400,
    letterSpacing: 2,
    marginTop: 6,
    textTransform: 'uppercase',
  },

  // Button row
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfBtn: {
    flex: 1,
    backgroundColor: Brand.emerald800,
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  halfBtnAlt: {
    backgroundColor: Brand.emerald50,
  },
  halfBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.white,
  },

  // Preview
  previewImage: {
    width: '100%',
    height: 320,
    borderRadius: 20,
    backgroundColor: Brand.slate50,
    marginBottom: 16,
  },

  // Primary button
  primaryBtn: {
    backgroundColor: Brand.emerald800,
    paddingVertical: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: Brand.slate300,
  },
  primaryBtnText: {
    color: Brand.white,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },

  // Link
  linkWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.emerald700,
  },

  // Loading
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.slate800,
    marginTop: 20,
  },
  loadingHint: {
    fontSize: 13,
    color: Brand.slate400,
    marginTop: 6,
  },

  // Done
  doneEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Brand.slate800,
    marginBottom: 8,
  },
  doneDetail: {
    fontSize: 14,
    color: Brand.slate500,
    lineHeight: 22,
  },

  // Language badge
  langBadge: {
    backgroundColor: Brand.emerald50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Brand.emerald100,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.emerald800,
  },

  // Medication card
  medCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: Brand.slate200,
    borderRadius: 20,
    backgroundColor: Brand.white,
    marginBottom: 12,
  },
  medCardDeselected: {
    opacity: 0.5,
    backgroundColor: Brand.slate50,
  },
  medTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Brand.slate300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Brand.emerald600,
    borderColor: Brand.emerald600,
  },
  medName: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.slate800,
    flex: 1,
  },
  doseBadge: {
    backgroundColor: Brand.emerald50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  doseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.emerald700,
  },
  medFreq: {
    fontSize: 13,
    color: Brand.slate500,
    marginBottom: 4,
    marginLeft: 32,
  },
  medDesc: {
    fontSize: 12,
    color: Brand.slate400,
    lineHeight: 18,
    marginLeft: 32,
    marginBottom: 6,
  },
  importanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Brand.amber50,
    padding: 10,
    borderRadius: 12,
    marginLeft: 32,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Brand.amber100,
  },
  importanceText: {
    fontSize: 11,
    color: Brand.amber800,
    lineHeight: 16,
    flex: 1,
  },

  // Timing chips
  timingRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 32,
    marginTop: 4,
    marginBottom: 4,
  },
  timeChip: {
    backgroundColor: Brand.slate50,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.slate100,
  },
  timeChipText: {
    fontSize: 11,
    color: Brand.slate500,
    fontWeight: '600',
  },

  // Notification toggle
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 32,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Brand.slate100,
  },
  notifyLabel: {
    fontSize: 13,
    color: Brand.slate500,
    flex: 1,
  },
});
