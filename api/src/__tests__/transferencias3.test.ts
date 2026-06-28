import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

// CRC16-CCITT (poly 0x1021, init 0xFFFF) — same algorithm as the service
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// ---------------------------------------------------------------------------
// POST /transferencias3/qr
// ---------------------------------------------------------------------------

describe('POST /transferencias3/qr', () => {
  it('generates an EMV payload with a valid CRC16-CCITT checksum in the last 4 characters', async () => {
    const res = await request(app)
      .post('/transferencias3/qr')
      .send({ amountArs: 15000 });

    expect(res.status).toBe(200);
    expect(typeof res.body.emv).toBe('string');
    expect(res.body.emv.length).toBeGreaterThan(4);

    const emv: string = res.body.emv;

    // EMVCo structure: payload ends with "6304" + 4-char hex CRC.
    // The CRC is computed over everything up to and including "6304".
    const body = emv.slice(0, -4);
    expect(body.slice(-4)).toBe('6304'); // sanity-check the CRC tag is present
    expect(emv.slice(-4).toUpperCase()).toBe(crc16(body));
  });
});
