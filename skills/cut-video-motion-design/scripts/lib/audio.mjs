// Audio helpers: decode any media to Float32 PCM with ffmpeg, RMS envelope in dBFS, WAV writer.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

export function decodePCM(file, { rate = 48000, channels = 1, filter = null } = {}) {
  const args = ['-v', 'error', '-i', file, '-vn'];
  if (filter) args.push('-af', filter);
  args.push('-ac', String(channels), '-ar', String(rate), '-f', 'f32le', '-');
  const r = spawnSync('ffmpeg', args, { maxBuffer: 2 ** 31 });
  if (r.status !== 0) throw new Error(r.stderr.toString());
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
}

// RMS level per hop in dBFS (interleaved channels are averaged together).
export function envelope(pcm, rate, hop = 0.01, channels = 1) {
  const H = Math.round(rate * hop) * channels, n = Math.floor(pcm.length / H), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0; for (let k = i * H; k < (i + 1) * H; k++) s += pcm[k] * pcm[k];
    out[i] = 10 * Math.log10(s / H + 1e-12);
  }
  return out;
}

export function percentile(arr, q) { const a = Float32Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; }

// 32-bit float WAV (no clipping issues while mixing).
export function writeWav(file, pcm, rate, channels) {
  const data = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(channels, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * channels * 4, 28); h.writeUInt16LE(channels * 4, 32); h.writeUInt16LE(32, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}
