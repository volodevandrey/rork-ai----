import { bytesToHex } from '../services/max/bytes';
import { compressLz4Block, decompressLz4Block } from '../services/max/compression';
import { computeChatCacheFingerprint } from '../services/max/fingerprint';
import { PacketReceiver, packPacket, unpackPacket } from '../services/max/protocol';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

for (const length of [0, 1, 14, 15, 16, 31, 32, 254, 255, 269, 270, 1024, 8192]) {
  const source = Uint8Array.from({ length }, (_, index) => (index * 31 + length * 7) & 0xff);
  const compressed = compressLz4Block(source);
  const restored = decompressLz4Block(compressed, Math.max(length, 1));
  assert(equalBytes(source, restored), `LZ4 round-trip failed at ${length} bytes`);
}

const packed = packPacket(
  208,
  {
    cursor: '',
    count: 50,
    sample: 'Проверка длинного сжатого пакета MAX',
  },
  321,
);
const packet = unpackPacket(packed);
assert(packet.opcode === 208, 'Opcode was not preserved');
assert(packet.seq === 321, 'Sequence was not preserved');
assert((packet.payload as Record<string, unknown>).count === 50, 'MessagePack payload failed');

const receiver = new PacketReceiver();
assert(receiver.feed(packed.slice(0, 7)).length === 0, 'Receiver accepted an incomplete header');
assert(receiver.feed(packed.slice(7, 19)).length === 0, 'Receiver accepted an incomplete packet');
const complete = receiver.feed(packed.slice(19));
assert(complete.length === 1 && equalBytes(complete[0], packed), 'Receiver did not reassemble packet');

const fingerprint = computeChatCacheFingerprint(123456789n, 'a1b2c3d4e5f60708');
assert(fingerprint.length === 96, 'Fingerprint must contain three SHA-256 digests');
assert(
  bytesToHex(fingerprint) ===
    'e827c8415a0c192f0447d7aa22bcb6351c1460961eb8f06ea498f1f2e35133886974ce4cf59f6634ae6c74109315ae54021975401d0476c83fa3e5d8a3a446b83a91091bb18eac02a321811daa5ace7ce2c94675850a0b88de8ca0aec50f5de5',
  'Fingerprint algorithm changed unexpectedly',
);

console.log('Protocol smoke tests passed');
