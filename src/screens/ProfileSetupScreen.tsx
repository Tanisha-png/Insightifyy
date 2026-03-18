import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createEncryptedUserProfile, decryptUserProfile, type UserProfile } from '../models/UserProfile';

type Props = {
  onComplete?: () => void;
};

const VAULT_KEY_ID = 'insightifyy.vaultKey.v1';
const PROFILE_ID = 'insightifyy.profile.v1';

export function ProfileSetupScreen({ onComplete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [dob, setDob] = useState<Date>(new Date('2000-01-01'));
  const [showPicker, setShowPicker] = useState(false);
  const [monthlySurplus, setMonthlySurplus] = useState('800');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [draftFullName, setDraftFullName] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftDob, setDraftDob] = useState<Date>(new Date('2000-01-01'));
  const [draftMonthlySurplus, setDraftMonthlySurplus] = useState('800');
  const [draftImage, setDraftImage] = useState<string | null>(null);

  const dobLabel = useMemo(() => formatDate(dob), [dob]);
  const draftDobLabel = useMemo(() => formatDate(draftDob), [draftDob]);

  useEffect(() => {
    (async () => {
      try {
        const [storedProfileJson, vaultKey, encryptedProfileJson] = await Promise.all([
          AsyncStorage.getItem('@insightifyy/profile'),
          SecureStore.getItemAsync(VAULT_KEY_ID),
          SecureStore.getItemAsync(PROFILE_ID),
        ]);

        let loadedAny = false;

        if (storedProfileJson) {
          const parsed = safeJsonParse<{ name?: string; bio?: string; imageUri?: string | null }>(
            storedProfileJson
          );
          if (parsed?.name) setFullName(parsed.name);
          if (typeof parsed?.bio === 'string') setBio(parsed.bio);
          if (typeof parsed?.imageUri === 'string' || parsed?.imageUri === null) {
            setImage(parsed.imageUri ?? null);
          }
          loadedAny = true;
        }

        if (vaultKey && encryptedProfileJson) {
          const encryptedProfile = safeJsonParse<UserProfile>(encryptedProfileJson);
          if (encryptedProfile) {
            const plain = decryptUserProfile({ profile: encryptedProfile, vaultKey });
            if (plain.name) setFullName(plain.name);
            if (plain.dobIso) {
              const parsedDob = new Date(plain.dobIso);
              if (!Number.isNaN(parsedDob.getTime())) setDob(parsedDob);
            }
            if (Number.isFinite(plain.avgMonthlySurplus)) {
              setMonthlySurplus(String(plain.avgMonthlySurplus));
            }
            if (plain.profilePicUri) setImage(plain.profilePicUri);
            loadedAny = true;
          }
        }

        setHasExistingProfile(loadedAny);
        if (!loadedAny) {
          setIsEditing(true);
          setDraftFullName('');
          setDraftBio('');
          setDraftDob(new Date('2000-01-01'));
          setDraftMonthlySurplus('800');
          setDraftImage(null);
        } else {
          setIsEditing(false);
        }
      } catch {
        // Ignore hydration errors; user can still edit manually.
        setIsEditing(true);
      }
    })();
  }, []);

  function beginEdit() {
    setError(null);
    setDraftFullName(fullName);
    setDraftBio(bio);
    setDraftDob(dob);
    setDraftMonthlySurplus(monthlySurplus);
    setDraftImage(image);
    setIsEditing(true);
  }

  function cancelEdit() {
    setError(null);
    setDraftFullName(fullName);
    setDraftBio(bio);
    setDraftDob(dob);
    setDraftMonthlySurplus(monthlySurplus);
    setDraftImage(image);
    setIsEditing(false);
    setShowPicker(false);
  }

  async function saveEdits() {
    setError(null);

    const trimmed = draftFullName.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setError('Please enter your full name.');
      return;
    }

    if (!isAtLeast18(draftDob)) {
      setError('You must be at least 18 years old to use Insightifyy.');
      return;
    }

    const parsedSurplus = toMoney(draftMonthlySurplus);
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
        dobIso: draftDob.toISOString().slice(0, 10),
        profilePicUri: draftImage,
        avgMonthlySurplus: parsedSurplus,
        vaultKey,
      });

      await SecureStore.setItemAsync(PROFILE_ID, JSON.stringify(profile), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      await saveProfile({
        name: trimmed,
        bio: draftBio,
        imageUri: draftImage,
      });

      setFullName(trimmed);
      setBio(draftBio);
      setDob(draftDob);
      setMonthlySurplus(String(parsedSurplus));
      setImage(draftImage);

      setHasExistingProfile(true);
      setIsEditing(false);

      if (!hasExistingProfile) {
        onComplete?.();
      }
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
          <View style={styles.headerRow}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.kicker}>Secure profile</Text>
              <Text style={styles.title}>{hasExistingProfile ? 'Your profile' : 'Let’s set you up'}</Text>
              <Text style={styles.subtitle}>
                We encrypt your name and date of birth before saving them on-device.
              </Text>
            </View>
            {!isEditing && (
              <Pressable
                accessibilityRole="button"
                onPress={beginEdit}
                style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile picture</Text>
          <View style={styles.picRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (!isEditing) return;
                pickImage().then((uri) => {
                  if (uri) setDraftImage(uri);
                });
              }}
              style={({ pressed }) => [
                styles.picPlaceholder,
                pressed && styles.pressed,
              ]}
            >
              {(isEditing ? draftImage : image) ? (
                <Image
                  source={{ uri: (isEditing ? draftImage : image) as string }}
                  style={styles.picImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.picInitials}>{initials(isEditing ? draftFullName : fullName)}</Text>
              )}
            </Pressable>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.helper}>Add a photo or keep the default avatar.</Text>
              {isEditing ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    pickImage().then((uri) => {
                      if (uri) setDraftImage(uri);
                    });
                  }}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {draftImage ? 'Change photo' : 'Add photo'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            {isEditing ? (
              <TextInput
                value={draftFullName}
                onChangeText={setDraftFullName}
                autoCapitalize="words"
                placeholder="e.g., Jordan Lee"
                placeholderTextColor="#CCCCCC"
                style={styles.input}
              />
            ) : (
              <Text style={styles.valueText}>{fullName || '—'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio (optional)</Text>
            {isEditing ? (
              <TextInput
                value={draftBio}
                onChangeText={setDraftBio}
                multiline
                placeholder="Tell Insightifyy a bit about your financial goals."
                placeholderTextColor="#CCCCCC"
                style={[styles.input, styles.bioInput]}
              />
            ) : (
              <Text style={styles.valueText}>{bio?.trim() ? bio : '—'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of birth</Text>
            {isEditing ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowPicker(true)}
                style={({ pressed }) => [styles.dobButton, pressed && styles.pressed]}
              >
                <Text style={styles.dobText}>{draftDobLabel}</Text>
                <Text style={styles.dobHint}>Tap to change</Text>
              </Pressable>
            ) : (
              <Text style={styles.valueText}>{dobLabel || '—'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Average monthly surplus</Text>
            <Text style={styles.helper}>Total income minus total expenses</Text>
            {isEditing ? (
              <TextInput
                value={draftMonthlySurplus}
                onChangeText={setDraftMonthlySurplus}
                keyboardType="decimal-pad"
                placeholder="e.g., 800"
                placeholderTextColor="#CCCCCC"
                style={styles.input}
              />
            ) : (
              <Text style={styles.valueText}>{monthlySurplus || '—'}</Text>
            )}
          </View>

          {showPicker ? (
            <DateTimePicker
              value={draftDob}
              mode="date"
              display={Platform.select({ ios: 'spinner', android: 'default', default: 'default' })}
              maximumDate={new Date()}
              onChange={(_, selectedDate) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (selectedDate) setDraftDob(selectedDate);
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

        {isEditing ? (
          <View style={styles.editActions}>
            <Pressable
              accessibilityRole="button"
              onPress={saveEdits}
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || saving) && styles.primaryPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={cancelEdit}
              disabled={saving}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
                saving && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={beginEdit}
            style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryCtaText}>Edit Profile</Text>
          </Pressable>
        )}

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

async function saveProfile(params: {
  name: string;
  bio: string;
  imageUri: string | null;
}): Promise<void> {
  const profile = {
    name: params.name,
    bio: params.bio,
    imageUri: params.imageUri,
  };

  await AsyncStorage.setItem('@insightifyy/profile', JSON.stringify(profile));
  await AsyncStorage.setItem('@insightifyy/profileCreated', 'true');
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kicker: {
    color: '#9AE6FF',
    fontSize: 12,
    letterSpacing: 2.1,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 20 },
  editButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  editButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
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
  valueText: { color: 'rgba(255,255,255,0.88)', fontSize: 16, lineHeight: 22, fontWeight: '700' },
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
  bioInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  dobButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.40)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dobText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  dobHint: { color: '#E0E0E0', fontSize: 12, fontWeight: '600' },
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
  editActions: { gap: 10 },
  cancelButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  secondaryCta: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  secondaryCtaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  footnote: {
    color: 'rgba(255,255,255,0.56)',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});

