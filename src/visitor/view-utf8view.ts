import * as type from '../type.js';
import { makeData, Data } from '../data.js';

export function decodeUtf8View<T extends type.Utf8View>(
    type: T,
    length: number,
    nullCount: number,
    nullBitmap: Uint8Array,
    viewsBuffer: Uint8Array,
    dataBuffers: Uint8Array[]
): Data<T> {
    if (length === 0) {
        return makeData({ type, length, nullCount, nullBitmap, valueOffsets: new Uint8Array(new Int32Array([0]).buffer), data: new Uint8Array(0) });
    }
    const views = new DataView(viewsBuffer.buffer, viewsBuffer.byteOffset, viewsBuffer.byteLength);
    const offsets = new Int32Array(length + 1);
    const chunks: Uint8Array[] = new Array(length);
    let running = 0;
    for (let i = 0; i < length; i++) {
        const base = i * 16;
        let slice = new Uint8Array(0);
        if (base + 4 <= views.byteLength) {
            const strLength = views.getInt32(base, true);
            if (strLength <= 12) {
                if (base + 4 + strLength <= views.byteLength) {
                    slice = new Uint8Array(viewsBuffer.buffer, viewsBuffer.byteOffset + base + 4, strLength);
                }
            } else if (base + 16 <= views.byteLength) {
                const bufferIndex = views.getInt32(base + 8, true);
                const offset = views.getInt32(base + 12, true);
                const buf = dataBuffers[bufferIndex];
                if (buf && offset >= 0 && offset + strLength <= buf.byteLength) {
                    slice = new Uint8Array(buf.buffer, buf.byteOffset + offset, strLength);
                }
            }
        }
        chunks[i] = slice;
        offsets[i] = running;
        running += slice.byteLength;
    }
    offsets[length] = running;
    const out = new Uint8Array(running);
    let cursor = 0;
    for (let i = 0; i < length; i++) {
        const c = chunks[i];
        out.set(c, cursor);
        cursor += c.byteLength;
    }
    // Build equivalent Utf8View logical data while preserving original type.
    return makeData({ type, length, nullCount, nullBitmap, valueOffsets: new Uint8Array(offsets.buffer), data: out });
}
