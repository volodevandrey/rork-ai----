import { sha256 } from '@noble/hashes/sha256';
import { utf8ToBytes } from '@noble/hashes/utils';

import { concatBytes, hexToBytes, int64BigEndian } from './bytes';

const SIGNATURE_DIGEST = hexToBytes(
  '1684414033eb263e2c615f8b7df5ed8793850a07656304997fbf07e9e21e1e93',
);
const SO_DIGEST = hexToBytes(
  '90e2fb8745b17b42a10182f8d8ac590e3fca5b311e2ce2d5144fa2c18cb3090d',
);
const DEX_DIGEST = hexToBytes(
  '0a6265f6e5d8231b9cba641f8c40475e6f3baeb06ed41b804b9bf7307aa4214e',
);

export function computeChatCacheFingerprint(callsSeed: number | bigint, deviceId: string): Uint8Array {
  const seed = int64BigEndian(BigInt(callsSeed));
  const device = utf8ToBytes(deviceId);
  const digest = (prefix: Uint8Array) => sha256(concatBytes(prefix, seed, device));
  return concatBytes(digest(SIGNATURE_DIGEST), digest(DEX_DIGEST), digest(SO_DIGEST));
}
