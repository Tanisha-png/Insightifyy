import CryptoJS from 'crypto-js';

export type EncryptedBlob = {
  v: 1;
  alg: 'AES-256';
  ivB64: string;
  ctB64: string;
};

export class CryptoVault {
  private readonly keyMaterial: CryptoJS.lib.WordArray;

  constructor(params: { key: string }) {
    this.keyMaterial = CryptoJS.SHA256(params.key);
  }

  encryptUtf8(plaintext: string): EncryptedBlob {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plaintext, this.keyMaterial, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      v: 1,
      alg: 'AES-256',
      ivB64: CryptoJS.enc.Base64.stringify(iv),
      ctB64: CryptoJS.enc.Base64.stringify(encrypted.ciphertext),
    };
  }

  decryptUtf8(blob: EncryptedBlob): string {
    if (blob.v !== 1 || blob.alg !== 'AES-256') {
      throw new Error('Unsupported encrypted payload format');
    }

    const iv = CryptoJS.enc.Base64.parse(blob.ivB64);
    const ciphertext = CryptoJS.enc.Base64.parse(blob.ctB64);

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext } as CryptoJS.lib.CipherParams,
      this.keyMaterial,
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    return CryptoJS.enc.Utf8.stringify(decrypted);
  }
}

