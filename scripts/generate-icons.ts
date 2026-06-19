/** Generate simple PNG icons for the extension. */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { deflateSync } from 'zlib';

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function createPng(size: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw: number[] = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter none
    for (let x = 0; x < size; x++) {
      const cx = size / 2;
      const cy = size / 2;
      const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const inCircle = r < size * 0.4;
      const inPrompt = x > size * 0.25 && x < size * 0.75 && y > size * 0.55 && y < size * 0.65;
      if (inCircle || inPrompt) {
        raw.push(88, 166, 255); // accent blue
      } else {
        raw.push(13, 17, 23); // dark bg
      }
    }
  }

  const compressed = deflateSync(Buffer.from(raw));
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', iend),
  ]);
}

const outDir = join(import.meta.dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  writeFileSync(join(outDir, `icon${size}.png`), createPng(size));
}

console.log('Icons generated in public/icons/');