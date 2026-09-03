import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, '..')
const iconDirectory = path.join(
  projectDirectory,
  'assets',
  'amazfit-bip-6',
)

function crc32(buffer) {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, checksum])
}

const width = 124
const height = 124
const scanlines = Buffer.alloc((width * 4 + 1) * height)

for (let y = 0; y < height; y += 1) {
  const row = y * (width * 4 + 1)
  scanlines[row] = 0
  for (let x = 0; x < width; x += 1) {
    const pixel = row + 1 + x * 4
    scanlines[pixel] = 37
    scanlines[pixel + 1] = 99
    scanlines[pixel + 2] = 235
    scanlines[pixel + 3] = 255
  }
}

const header = Buffer.alloc(13)
header.writeUInt32BE(width, 0)
header.writeUInt32BE(height, 4)
header[8] = 8
header[9] = 6

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(scanlines)),
  chunk('IEND', Buffer.alloc(0)),
])

await mkdir(iconDirectory, { recursive: true })
await writeFile(path.join(iconDirectory, 'icon.png'), png)
console.log('Generated deterministic 124x124 feasibility icon')
