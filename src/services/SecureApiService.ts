import * as SecureStore from 'expo-secure-store';

import type { EncryptedBlob } from '../security/CryptoVault';
import { CryptoVault } from '../security/CryptoVault';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type SecureApiConfig = {
  baseUrl: string;
  vaultKeyId?: string;
};

export class SecureApiService {
  private readonly baseUrl: string;
  private readonly vaultKeyId: string;

  constructor(config: SecureApiConfig) {
    if (!/^https:\/\//i.test(config.baseUrl)) {
      throw new Error('SecureApiService requires an https baseUrl (TLS 1.3 expected).');
    }
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.vaultKeyId = config.vaultKeyId ?? 'insightifyy.vaultKey.v1';
  }

  async setVaultKey(vaultKey: string): Promise<void> {
    await SecureStore.setItemAsync(this.vaultKeyId, vaultKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async getVaultKey(): Promise<string> {
    const key = await SecureStore.getItemAsync(this.vaultKeyId);
    if (!key) throw new Error('Missing vault key. Initialize it during onboarding.');
    return key;
  }

  async encryptJson<T>(data: T): Promise<EncryptedBlob> {
    const key = await this.getVaultKey();
    const vault = new CryptoVault({ key });
    return vault.encryptUtf8(JSON.stringify(data));
  }

  async decryptJson<T>(blob: EncryptedBlob): Promise<T> {
    const key = await this.getVaultKey();
    const vault = new CryptoVault({ key });
    const plaintext = vault.decryptUtf8(blob);
    return JSON.parse(plaintext) as T;
  }

  async postEncrypted<TReq, TRes>(path: string, payload: TReq): Promise<TRes> {
    const encrypted = await this.encryptJson(payload);
    return await this.request<TRes>('POST', path, { encrypted });
  }

  async request<TRes>(
    method: HttpMethod,
    path: string,
    body?: unknown
  ): Promise<TRes> {
    await this.assertTls13Ready();

    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await safeReadText(res);
      throw new Error(`Secure API error (${res.status}): ${text ?? res.statusText}`);
    }

    const text = await res.text();
    return (text ? (JSON.parse(text) as TRes) : (undefined as TRes));
  }

  private async assertTls13Ready(): Promise<void> {
    // Placeholder for: TLS 1.3 enforcement, certificate pinning, and transport policy checks.
    return;
  }
}

async function safeReadText(res: Response): Promise<string | null> {
  try {
    return await res.text();
  } catch {
    return null;
  }
}

