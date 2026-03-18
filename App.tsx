import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ManualEntryScreen } from './src/screens/ManualEntryScreen';
import { ProfileSetupScreen } from './src/screens/ProfileSetupScreen';
import { SecurityTrustScreen } from './src/screens/SecurityTrustScreen';
import { decryptUserProfile, type UserProfile } from './src/models/UserProfile';

export default function App() {
  const [screen, setScreen] = useState<'trust' | 'profile' | 'manual'>('trust');
  const [profileSurplus, setProfileSurplus] = useState<number | undefined>(undefined);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const created = await AsyncStorage.getItem('@insightifyy/profileCreated');
        if (created === 'true') {
          const surplus = await loadSurplusFromProfile();
          setProfileSurplus(surplus);
          setScreen('manual');
        }
      } finally {
        setBootstrapped(true);
      }
    })();
  }, []);

  return (
    <>
      {bootstrapped &&
        (screen === 'trust' ? (
          <SecurityTrustScreen onContinue={() => setScreen('profile')} />
        ) : screen === 'profile' ? (
          <ProfileSetupScreen
            onComplete={async () => {
              const surplus = await loadSurplusFromProfile();
              setProfileSurplus(surplus);
              await AsyncStorage.setItem('@insightifyy/profileCreated', 'true');
              setScreen('manual');
            }}
          />
        ) : (
          <ManualEntryScreen
            initialMonthlySurplus={profileSurplus}
            onBack={() => setScreen('trust')}
          />
        ))}
      <StatusBar style="light" />
    </>
  );
}

async function loadSurplusFromProfile(): Promise<number | undefined> {
  try {
    const vaultKey = await SecureStore.getItemAsync('insightifyy.vaultKey.v1');
    const profileJson = await SecureStore.getItemAsync('insightifyy.profile.v1');
    if (!vaultKey || !profileJson) return undefined;

    const profile = JSON.parse(profileJson) as UserProfile;
    const plain = decryptUserProfile({ profile, vaultKey });
    return Number.isFinite(plain.avgMonthlySurplus) ? plain.avgMonthlySurplus : undefined;
  } catch {
    return undefined;
  }
}
