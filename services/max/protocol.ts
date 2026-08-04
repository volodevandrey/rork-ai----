import { decode, encode } from '@msgpack/msgpack';

import { concatBytes } from './bytes';
import { compressLz4Block, decompressPayload } from './compression';
import type { MaxPacket } from './types';

export const HEADER_SIZE = 10;
const MAX_BUFFER_SIZE = 16 * 1024 * 1024;

export function packPacket(opcode: number, payload: Record<string, unknown>, seq: number): Uint8Array {
  const raw = encode(payload, { useBigInt64: true });
  const body = raw.length < 32 ? raw : compressLz4Block(raw);
  const compressionFlag = raw.length < 32 ? 0 : Math.floor(raw.length / body.length) + 1;
  if (body.length > 0x00ff_ffff) throw new Error('Пакет MAX слишком большой');

  const header = new Uint8Array(HEADER_SIZE);
  const view = new DataView(header.buffer);
  view.setUint8(0, 10);
  view.setUint8(1, 0);
  view.setUint16(2, seq, false);
  view.setUint16(4, opcode, false);
  view.setUint32(6, ((compressionFlag & 0xff) << 24) | body.length, false);
  return concatBytes(header, body);
}

export function unpackPacket(packet: Uint8Array): MaxPacket {
  if (packet.length < HEADER_SIZE) throw new Error('Оборванный пакет MAX');
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
  const api = view.getUint8(0);
  const cmd = view.getUint8(1);
  const seq = view.getUint16(2, false);
  const opcode = view.getUint16(4, false);
  const packedLength = view.getUint32(6, false);
  const compressionFlag = packedLength >>> 24;
  const payloadLength = packedLength & 0x00ff_ffff;
  const end = HEADER_SIZE + payloadLength;
  if (end > packet.length) throw new Error('Длина пакета MAX не совпадает с заголовком');

  let payload: unknown = null;
  if (payloadLength > 0) {
    const slice = packet.slice(HEADER_SIZE, end);
    const bytes = compressionFlag === 0 ? slice : decompressPayload(slice);
    payload = bytes.length === 0 ? null : decode(bytes, { useBigInt64: true });
  }

  return { api, cmd, seq, opcode, payload };
}

export class PacketReceiver {
  private buffer: Uint8Array<ArrayBufferLike> = new Uint8Array(0);

  feed(chunk: Uint8Array): Uint8Array[] {
    this.buffer = concatBytes(this.buffer, chunk);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.reset();
      throw new Error('Входной буфер MAX переполнен');
    }

    const packets: Uint8Array[] = [];
    let offset = 0;
    while (this.buffer.length - offset >= HEADER_SIZE) {
      const view = new DataView(
        this.buffer.buffer,
        this.buffer.byteOffset + offset,
        this.buffer.length - offset,
      );
      const packedLength = view.getUint32(6, false);
      const totalLength = HEADER_SIZE + (packedLength & 0x00ff_ffff);
      if (this.buffer.length - offset < totalLength) break;
      packets.push(this.buffer.slice(offset, offset + totalLength));
      offset += totalLength;
    }

    if (offset > 0) this.buffer = this.buffer.slice(offset);
    return packets;
  }

  reset(): void {
    this.buffer = new Uint8Array(0);
  }
}
