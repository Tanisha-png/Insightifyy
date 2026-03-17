import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricCheckResult =
  | { ok: true }
  | { ok: false; reason: 'not_available' | 'not_enrolled' | 'cancelled' | 'failed' };

export class BiometricGate {
  async authenticate(promptMessage: string): Promise<BiometricCheckResult> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return { ok: false, reason: 'not_available' };

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { ok: false, reason: 'not_enrolled' };

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) return { ok: true };
    if (result.error === 'user_cancel' || result.error === 'system_cancel') {
      return { ok: false, reason: 'cancelled' };
    }
    return { ok: false, reason: 'failed' };
  }
}

