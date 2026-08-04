import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { bytesToHex } from './bytes';

const IDENTITY_KEY = 'max-stories.device-identity.v1';
const TOKEN_KEY = 'max-stories.login-token.v1';

export interface DeviceIdentity {
  instanceId: string;
  deviceId: string;
  clientSessionId: number;
}

function formatUuid(bytes: Uint8Array): string {
  const copy = Uint8Array.from(bytes);
  copy[6] = (copy[6] & 0x0f) | 0x40;
  copy[8] = (copy[8] & 0x3f) | 0x80;
  const hex = bytesToHex(copy);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  const stored = await SecureStore.getItemAsync(IDENTITY_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<DeviceIdentity>;
      if (
        typeof parsed.instanceId === 'string' &&
        typeof parsed.deviceId === 'string' &&
        typeof parsed.clientSessionId === 'number'
      ) {
        return parsed as DeviceIdentity;
      }
    } catch {
      await SecureStore.deleteItemAsync(IDENTITY_KEY);
    }
  }

  const random = await Crypto.getRandomBytesAsync(28);
  const view = new DataView(random.buffer, random.byteOffset, random.byteLength);
  const identity: DeviceIdentity = {
    instanceId: formatUuid(random.slice(0, 16)),
    deviceId: bytesToHex(random.slice(16, 24)),
    clientSessionId: (view.getUint32(24, false) & 0x7fff_ffff) || 1,
  };
  await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

export async function readLoginToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveLoginToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearLoginToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
