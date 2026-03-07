import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Brand } from '@/constants/theme';
import { api } from '../services/axiosApi';

const GENDER_OPTIONS = ['Male', 'Female', 'Others'] as const;

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>({});

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        router.replace('/(tabs)');
      }
    })();
  }, []);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!username.trim()) e.username = 'Username is required';
    else if (username.length < 3) e.username = 'At least 3 characters';
    else if (username.length > 20) e.username = 'Max 20 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) e.username = 'Letters, numbers, underscore only';

    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'At least 8 characters';
    else if (!isLogin) {
      if (!/[A-Z]/.test(password)) e.password = 'Need an uppercase letter';
      else if (!/[a-z]/.test(password)) e.password = 'Need a lowercase letter';
      else if (!/[0-9]/.test(password)) e.password = 'Need a digit';
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) e.password = 'Need a special character';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      if (isLogin) {
        const form = new URLSearchParams();
        form.append('username', username);
        form.append('password', password);
        const res = await api.post('/auth/token', form.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        await SecureStore.setItemAsync('userToken', res.data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
        router.replace('/(tabs)');
      } else {
        const body: any = { username, password };
        if (age) body.age = parseInt(age);
        if (gender) body.gender = gender;
        const res = await api.post('/auth/register', body);
        await SecureStore.setItemAsync('userToken', res.data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      let msg = 'Something went wrong';
      if (e.response?.data?.detail) {
        const d = e.response.data.detail;
        if (typeof d === 'string') msg = d;
        else if (Array.isArray(d)) msg = d.map((x: any) => x.msg).join('\n');
      }
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setIsLogin(!isLogin);
    setErrors({});
    setUsername('');
    setPassword('');
    setAge('');
    setGender('');
    setShowPassword(false);
  }

  return (
    <View style={styles.container}>
      {/* Background decoration */}
      <View style={styles.bgTop}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoIcon}>
              <Ionicons name="medkit" size={28} color={Brand.white} />
            </View>
            <Text style={styles.appName}>PillMate</Text>
            <Text style={styles.tagline}>Your medication companion</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tab switcher */}
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, isLogin && styles.tabActive]}
                onPress={() => { if (!isLogin) switchMode(); }}
              >
                <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Sign In</Text>
              </Pressable>
              <Pressable
                style={[styles.tab, !isLogin && styles.tabActive]}
                onPress={() => { if (isLogin) switchMode(); }}
              >
                <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Sign Up</Text>
              </Pressable>
            </View>

            {errors.general && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorBoxText}>{errors.general}</Text>
              </View>
            )}

            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <View style={[styles.inputWrap, errors.username && styles.inputError]}>
                <Ionicons name="person-outline" size={18} color={Brand.slate400} />
                <TextInput
                  style={styles.input}
                  placeholder="your_username"
                  placeholderTextColor={Brand.slate400}
                  value={username}
                  onChangeText={(t) => { setUsername(t); setErrors(prev => ({ ...prev, username: undefined })); }}
                  autoCapitalize="none"
                  maxLength={20}
                />
              </View>
              {errors.username && <Text style={styles.fieldError}>{errors.username}</Text>}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[styles.inputWrap, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={18} color={Brand.slate400} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Brand.slate400}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors(prev => ({ ...prev, password: undefined })); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={Brand.slate400}
                  />
                </Pressable>
              </View>
              {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
              {!isLogin && !errors.password && (
                <View style={styles.rules}>
                  {[
                    { test: password.length >= 8, label: '8+ characters' },
                    { test: /[A-Z]/.test(password), label: 'Uppercase' },
                    { test: /[a-z]/.test(password), label: 'Lowercase' },
                    { test: /[0-9]/.test(password), label: 'Number' },
                    { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: 'Special' },
                  ].map((rule) => (
                    <View key={rule.label} style={styles.ruleChip}>
                      <Ionicons
                        name={rule.test ? 'checkmark-circle' : 'ellipse-outline'}
                        size={12}
                        color={rule.test ? Brand.emerald500 : Brand.slate300}
                      />
                      <Text style={[styles.ruleText, rule.test && { color: Brand.emerald700 }]}>
                        {rule.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Sign-up extra fields */}
            {!isLogin && (
              <>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Age</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="calendar-outline" size={18} color={Brand.slate400} />
                      <TextInput
                        style={styles.input}
                        placeholder="25"
                        placeholderTextColor={Brand.slate400}
                        value={age}
                        onChangeText={setAge}
                        keyboardType="numeric"
                        maxLength={3}
                      />
                    </View>
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1.3 }]}>
                    <Text style={styles.fieldLabel}>Gender</Text>
                    <Pressable
                      style={styles.inputWrap}
                      onPress={() => setShowGenderPicker(true)}
                    >
                      <Ionicons name="male-female-outline" size={18} color={Brand.slate400} />
                      <Text style={[styles.input, { color: gender ? Brand.slate800 : Brand.slate400 }]}>
                        {gender || 'Select'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={Brand.slate400} />
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            {/* Submit */}
            <Pressable
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.submitText}>Please wait...</Text>
              ) : (
                <>
                  <Text style={styles.submitText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                  <Ionicons name="arrow-forward" size={18} color={Brand.white} />
                </>
              )}
            </Pressable>

            {/* Switch */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </Text>
              <Pressable onPress={switchMode}>
                <Text style={styles.switchLink}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Gender Picker Modal */}
      <Modal visible={showGenderPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowGenderPicker(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Gender</Text>
            {GENDER_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.pickerOpt, gender === opt && styles.pickerOptSel]}
                onPress={() => { setGender(opt); setShowGenderPicker(false); }}
              >
                <Text style={[styles.pickerOptText, gender === opt && styles.pickerOptTextSel]}>
                  {opt}
                </Text>
                {gender === opt && <Ionicons name="checkmark" size={18} color={Brand.emerald800} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  // Background
  bgTop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(16,185,129,0.12)', top: -100, right: -80,
  },
  circle2: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(5,150,105,0.1)', top: 180, left: -60,
  },
  circle3: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(52,211,153,0.08)', bottom: 100, right: 30,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  // Logo
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Brand.emerald800, alignItems: 'center', justifyContent: 'center',
    shadowColor: Brand.emerald900, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    marginBottom: 16,
  },
  appName: { fontSize: 30, fontWeight: '900', color: Brand.emerald800, letterSpacing: -0.5 },
  tagline: { fontSize: 14, fontWeight: '500', color: Brand.slate500, marginTop: 4 },
  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Brand.slate100,
    borderRadius: 14,
    padding: 3,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: Brand.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: Brand.slate400 },
  tabTextActive: { color: Brand.emerald800, fontWeight: '700' },
  // Error box
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', padding: 14, borderRadius: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#FECACA',
  },
  errorBoxText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#DC2626' },
  // Fields
  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: Brand.slate500,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Brand.slate50, borderWidth: 1.5, borderColor: Brand.slate200,
    borderRadius: 14, paddingHorizontal: 16, gap: 10,
  },
  inputError: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  input: {
    flex: 1, fontSize: 16, color: Brand.slate800, paddingVertical: 14,
  },
  fieldError: { fontSize: 11, fontWeight: '600', color: '#EF4444', marginTop: 4, marginLeft: 4 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  // Rules
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  ruleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Brand.slate50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  ruleText: { fontSize: 10, fontWeight: '600', color: Brand.slate400 },
  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Brand.emerald800, paddingVertical: 18, borderRadius: 16, marginTop: 8,
    shadowColor: Brand.emerald900, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  submitText: { color: Brand.white, fontSize: 16, fontWeight: '700' },
  // Switch
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 20,
  },
  switchText: { fontSize: 13, color: Brand.slate500 },
  switchLink: { fontSize: 13, fontWeight: '700', color: Brand.emerald800 },
  // Overlay
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center',
    alignItems: 'center', padding: 24,
  },
  // Picker
  pickerCard: { backgroundColor: Brand.white, borderRadius: 22, padding: 20, width: '100%', maxWidth: 320 },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: Brand.slate800, textAlign: 'center', marginBottom: 14 },
  pickerOpt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 4,
  },
  pickerOptSel: { backgroundColor: Brand.emerald50 },
  pickerOptText: { fontSize: 16, fontWeight: '500', color: Brand.slate800 },
  pickerOptTextSel: { fontWeight: '700', color: Brand.emerald800 },
});
