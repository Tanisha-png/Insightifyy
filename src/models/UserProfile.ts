import type { EncryptedBlob } from '../security/CryptoVault';
import { CryptoVault } from '../security/CryptoVault';

export type UserProfile = {
  id: string;
  profilePicUri?: string | null;
  pii: {
    nameEnc: EncryptedBlob;
    dobIsoEnc: EncryptedBlob;
  };
  createdAtIso: string;
  updatedAtIso: string;
};

export type UserProfilePlain = {
  id: string;
  name: string;
  dobIso: string;
  profilePicUri?: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

export function createEncryptedUserProfile(params: {
  id: string;
  name: string;
  dobIso: string;
  profilePicUri?: string | null;
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
    createdAtIso: params.profile.createdAtIso,
    updatedAtIso: params.profile.updatedAtIso,
  };
}

