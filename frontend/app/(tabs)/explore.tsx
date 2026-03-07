import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Scan.</Text>
        <Text style={styles.subtitle}>Upload your prescription photo.</Text>
      </View>

      {/* Upload area */}
      <View style={styles.uploadArea}>
        <View style={styles.iconCircle}>
          <Ionicons name="cloud-upload-outline" size={32} color={Brand.green} />
        </View>
        <Text style={styles.uploadLabel}>Select Image</Text>
        <Text style={styles.uploadHint}>SUPPORTS PDF, PNG, JPG</Text>
      </View>

      {/* Analyze button */}
      <View style={styles.bottomSection}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
          onPress={() => {}}
        >
          <Text style={styles.btnText}>Analyze Prescription</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 48,
    fontFamily: 'serif',
    color: Brand.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Brand.gray400,
  },
  uploadArea: {
    flex: 1,
    maxHeight: 300,
    borderRadius: 36,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Brand.gray300,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uploadLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Brand.text,
    marginBottom: 8,
  },
  uploadHint: {
    fontSize: 10,
    color: Brand.gray400,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bottomSection: {
    paddingVertical: 32,
    paddingBottom: 100,
  },
  btnPrimary: {
    backgroundColor: Brand.green,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    transform: [{ scale: 0.97 }],
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
