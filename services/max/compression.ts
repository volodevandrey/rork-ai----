import { decompress as decompressZstd } from 'fzstd';
import lz4 from 'lz4js';

const MAX_DECOMPRESSED_SIZE = 32 * 1024 * 1024;

export function compressLz4Block(source: Uint8Array): Uint8Array {
  const extensionBytes = source.length < 15 ? 0 : Math.floor((source.length - 15) / 255) + 1;
  const output = new Uint8Array(1 + extensionBytes + source.length);
  output[0] = Math.min(source.length, 15) << 4;
  let position = 1;
  if (source.length >= 15) {
    let remaining = source.length - 15;
    while (remaining >= 255) {
      output[position++] = 255;
      remaining -= 255;
    }
    output[position++] = remaining;
  }
  output.set(source, position);
  return output;
}

function isMagic(bytes: Uint8Array, magic: readonly number[]): boolean {
  return magic.every((byte, index) => bytes[index] === byte);
}

export function decompressPayload(source: Uint8Array): Uint8Array {
  if (isMagic(source, [0x28, 0xb5, 0x2f, 0xfd])) {
    const result = decompressZstd(source);
    if (result.length > MAX_DECOMPRESSED_SIZE) throw new Error('Zstd-пакет слишком большой');
    return result;
  }

  if (isMagic(source, [0x04, 0x22, 0x4d, 0x18])) {
    const result = Uint8Array.from(lz4.decompress(source));
    if (result.length > MAX_DECOMPRESSED_SIZE) throw new Error('LZ4-пакет слишком большой');
    return result;
  }

  return decompressLz4Block(source, MAX_DECOMPRESSED_SIZE);
}

export function decompressLz4Block(source: Uint8Array, maxSize: number): Uint8Array {
  let output = new Uint8Array(1024);
  let outputLength = 0;
  let position = 0;

  const ensure = (extra: number) => {
    const required = outputLength + extra;
    if (required > maxSize) throw new Error('LZ4-пакет превысил допустимый размер');
    if (required <= output.length) return;
    let capacity = output.length;
    while (capacity < required) capacity = Math.min(capacity * 2, maxSize);
    const grown = new Uint8Array(capacity);
    grown.set(output.subarray(0, outputLength));
    output = grown;
  };

  while (position < source.length) {
    const token = source[position++];
    let literalLength = token >> 4;
    if (literalLength === 15) {
      while (position < source.length) {
        const byte = source[position++];
        literalLength += byte;
        if (byte !== 255) break;
      }
    }

    if (position + literalLength > source.length) throw new Error('Повреждённый LZ4-пакет');
    if (literalLength > 0) {
      ensure(literalLength);
      output.set(source.subarray(position, position + literalLength), outputLength);
      outputLength += literalLength;
      position += literalLength;
    }

    if (position >= source.length) break;
    if (position + 1 >= source.length) throw new Error('Оборванный LZ4-пакет');

    const offset = source[position] | (source[position + 1] << 8);
    position += 2;
    if (offset === 0 || offset > outputLength) throw new Error('Некорректное смещение LZ4');

    let matchLength = (token & 0x0f) + 4;
    if ((token & 0x0f) === 0x0f) {
      while (position < source.length) {
        const byte = source[position++];
        matchLength += byte;
        if (byte !== 255) break;
      }
    }

    ensure(matchLength);
    const start = outputLength - offset;
    for (let index = 0; index < matchLength; index += 1) {
      output[outputLength + index] = output[start + index];
    }
    outputLength += matchLength;
  }

  return output.slice(0, outputLength);
}
