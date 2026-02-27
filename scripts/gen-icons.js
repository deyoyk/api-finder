const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let n = i;
    for (let k = 0; k < 8; k++) n = (n & 1) ? (0xedb88320 ^ (n >>> 1)) : (n >>> 1);
    table[i] = n;
  }
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeChunk(out, type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  out.push(len);
  out.push(Buffer.from(type));
  out.push(data);
  const crcBuf = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  out.push(crc);
}

function createPng(size) {
  const out = [];
  out.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  writeChunk(out, 'IHDR', ihdr);
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) {
      const r = 99, g = 102, b = 241;
      raw.push(r, g, b);
    }
  }
  const idat = zlib.deflateSync(Buffer.from(raw), { level: 9 });
  writeChunk(out, 'IDAT', idat);
  writeChunk(out, 'IEND', Buffer.alloc(0));
  return Buffer.concat(out);
}

const root = path.join(__dirname, '..');
[16, 48, 128].forEach(function (s) {
  fs.writeFileSync(path.join(root, 'icon' + s + '.png'), createPng(s));
});
console.log('Wrote icon16.png, icon48.png, icon128.png');
