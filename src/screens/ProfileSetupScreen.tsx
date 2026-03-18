import DateTimePicker from '@react-native-community/datetimepicker';
import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createEncryptedUserProfile } from '../models/UserProfile';

type Props = {
  onComplete?: () => void;
};

const VAULT_KEY_ID = 'insightifyy.vaultKey.v1';
const PROFILE_ID = 'insightifyy.profile.v1';

export function ProfileSetupScreen({ onComplete }: Props) {
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState<Date>(new Date('2000-01-01'));
  const [showPicker, setShowPicker] = useState(false);
  const [monthlySurplus, setMonthlySurplus] = useState('800');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dobLabel = useMemo(() => formatDate(dob), [dob]);

  async function onSave() {
    setError(null);

    const trimmed = fullName.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setError('Please enter your full name.');
      return;
    }

    if (!isAtLeast18(dob)) {
      setError('You must be at least 18 years old to use Insightifyy.');
      return;
    }

    const parsedSurplus = toMoney(monthlySurplus);
    if (!Number.isFinite(parsedSurplus) || parsedSurplus < 0) {
      setError('Please enter a valid monthly surplus (0 or more).');
      return;
    }

    setSaving(true);
    try {
      const vaultKey = await getOrCreateVaultKey();
      const profile = createEncryptedUserProfile({
        id: 'local-user',
        name: trimmed,
        dobIso: dob.toISOString().slice(0, 10),
        profilePicUri: image,
        avgMonthlySurplus: parsedSurplus,
        vaultKey,
      });

      await SecureStore.setItemAsync(PROFILE_ID, JSON.stringify(profile), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      onComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Secure profile</Text>
          <Text style={styles.title}>Let’s set you up</Text>
          <Text style={styles.subtitle}>
            We encrypt your name and date of birth before saving them on-device.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile picture</Text>
          <View style={styles.picRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                pickImage().then((uri) => {
                  if (uri) setImage(uri);
                });
              }}
              style={({ pressed }) => [
                styles.picPlaceholder,
                pressed && styles.pressed,
              ]}
            >
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={styles.picImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.picInitials}>{initials(fullName)}</Text>
              )}
            </Pressable>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.helper}>Add a photo or keep the default avatar.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  pickImage().then((uri) => {
                    if (uri) setImage(uri);
                  });
                }}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>
                  {image ? 'Change photo' : 'Add photo'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholder="e.g., Jordan Lee"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of birth</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowPicker(true)}
              style={({ pressed }) => [styles.dobButton, pressed && styles.pressed]}
            >
              <Text style={styles.dobText}>{dobLabel}</Text>
              <Text style={styles.dobHint}>Tap to change</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Average monthly surplus</Text>
            <Text style={styles.helper}>Total income minus total expenses</Text>
            <TextInput
              value={monthlySurplus}
              onChangeText={setMonthlySurplus}
              keyboardType="decimal-pad"
              placeholder="e.g., 800"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
            />
          </View>

          {showPicker ? (
            <DateTimePicker
              value={dob}
              mode="date"
              display={Platform.select({ ios: 'spinner', android: 'default', default: 'default' })}
              maximumDate={new Date()}
              onChange={(_, selectedDate) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (selectedDate) setDob(selectedDate);
              }}
            />
          ) : null}

          {Platform.OS === 'ios' && showPicker ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowPicker(false)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Done</Text>
            </Pressable>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || saving) && styles.primaryPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Continue'}</Text>
        </Pressable>

        <Text style={styles.footnote}>
          Your PII is encrypted locally (AES-256 placeholder) and can be deleted anytime.
        </Text>
      </ScrollView>
    </View>
  );
}

async function getOrCreateVaultKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(VAULT_KEY_ID);
  if (existing) return existing;

  const bytes = await Crypto.getRandomBytes(32);
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await SecureStore.setItemAsync(VAULT_KEY_ID, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0]?.uri ?? null;
}

function isAtLeast18(dob: Date): boolean {
  const now = new Date();
  const cutoff = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  return dob <= cutoff;
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function toMoney(s: string): number {
  const n = Number(String(s).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070A12' },
  content: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 48, gap: 16 },
  header: { gap: 8 },
  kicker: {
    color: '#9AE6FF',
    fontSize: 12,
    letterSpacing: 2.1,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 20 },
  card: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(154,230,255,0.18)',
    padding: 16,
    gap: 14,
  },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  picRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  picPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 62,
    backgroundColor: 'rgba(154,230,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(154,230,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  picImage: {
    width: 62,
    height: 62,
    borderRadius: 62,
  },
  picInitials: { color: '#9AE6FF', fontSize: 18, fontWeight: '900', letterSpacing: 0.4 },
  field: { gap: 6 },
  label: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  helper: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 16 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  dobButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dobText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  dobHint: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700' },
  errorText: { color: '#FB7185', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: '#1D4ED8',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  primaryPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.2 },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignSelf: 'flex-start',
  },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  footnote: {
    color: 'rgba(255,255,255,0.56)',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});

