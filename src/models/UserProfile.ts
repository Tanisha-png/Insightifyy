import type { EncryptedBlob } from '../security/CryptoVault';
import { CryptoVault } from '../security/CryptoVault';

export type UserProfile = {
  id: string;
  profilePicUri?: string | null;
  pii: {
    nameEnc: EncryptedBlob;
    dobIsoEnc: EncryptedBlob;
  };
  financial: {
    avgMonthlySurplusEnc: EncryptedBlob;
  };
  createdAtIso: string;
  updatedAtIso: string;
};

export type UserProfilePlain = {
  id: string;
  name: string;
  dobIso: string;
  profilePicUri?: string | null;
  avgMonthlySurplus: number;
  createdAtIso: string;
  updatedAtIso: string;
};

export function createEncryptedUserProfile(params: {
  id: string;
  name: string;
  dobIso: string;
  profilePicUri?: string | null;
  avgMonthlySurplus: number;
  vaultKey: string;
  nowIso?: string;
}): UserProfile {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const vault = new CryptoVault({ key: params.vaultKey });

  return {
    id: params.id,
    profilePicUri: params.profilePicUri ?? null,
    pii: {
      nameEnc: vault.encryptUtf8(params.name),
      dobIsoEnc: vault.encryptUtf8(params.dobIso),
    },
    financial: {
      avgMonthlySurplusEnc: vault.encryptUtf8(String(params.avgMonthlySurplus)),
    },
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };
}

export function decryptUserProfile(params: {
  profile: UserProfile;
  vaultKey: string;
}): UserProfilePlain {
  const vault = new CryptoVault({ key: params.vaultKey });

  return {
    id: params.profile.id,
    profilePicUri: params.profile.profilePicUri ?? null,
    name: vault.decryptUtf8(params.profile.pii.nameEnc),
    dobIso: vault.decryptUtf8(params.profile.pii.dobIsoEnc),
    avgMonthlySurplus: Number(vault.decryptUtf8(params.profile.financial.avgMonthlySurplusEnc)),
    createdAtIso: params.profile.createdAtIso,
    updatedAtIso: params.profile.updatedAtIso,
  };
}

