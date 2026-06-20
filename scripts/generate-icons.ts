/** Generate REDLINE-style PNG icons for the extension. */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { deflateSync } from 'zlib';

const BG = [0, 0, 0] as const;
const RED = [255, 0, 0] as const;

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

function setPixel(raw: number[], x: number, y: number, size: number, rgb: readonly [number, number, number]): void {
  const offset = (y * size + x) * 3;
  raw[offset] = rgb[0];
  raw[offset + 1] = rgb[1];
  raw[offset + 2] = rgb[2];
}

function fillRect(
  raw: number[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  size: number,
  rgb: readonly [number, number, number]
): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (x >= 0 && x < size && y >= 0 && y < size) setPixel(raw, x, y, size, rgb);
    }
  }
}

function createPng(size: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const pixels = new Array(size * size * 3).fill(0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      setPixel(pixels, x, y, size, BG);
    }
  }

  const pad = Math.max(1, Math.floor(size * 0.12));
  const barH = Math.max(1, Math.floor(size * 0.14));
  const barW = Math.max(2, Math.floor(size * 0.52));
  const barX = Math.floor((size - barW) / 2);
  const barY = Math.floor(size * 0.58);
  fillRect(pixels, barX, barY, barW, barH, size, RED);

  const promptW = Math.max(2, Math.floor(size * 0.22));
  const promptH = Math.max(2, Math.floor(size * 0.22));
  const promptX = pad;
  const promptY = Math.floor(size * 0.28);
  fillRect(pixels, promptX, promptY, promptW, promptH, size, RED);

  const raw: number[] = [];
  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 3;
      raw.push(pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!);
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