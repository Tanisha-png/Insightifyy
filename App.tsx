import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ManualEntryScreen } from './src/screens/ManualEntryScreen';
import { ProfileSetupScreen } from './src/screens/ProfileSetupScreen';
import { SecurityTrustScreen } from './src/screens/SecurityTrustScreen';

export default function App() {
  const [screen, setScreen] = useState<'trust' | 'profile' | 'manual'>('trust');

  return (
    <>
      {screen === 'trust' ? (
        <SecurityTrustScreen onContinue={() => setScreen('profile')} />
      ) : screen === 'profile' ? (
        <ProfileSetupScreen onComplete={() => setScreen('manual')} />
      ) : (
        <ManualEntryScreen onBack={() => setScreen('trust')} />
      )}
      <StatusBar style="light" />
    </>
  );
}
