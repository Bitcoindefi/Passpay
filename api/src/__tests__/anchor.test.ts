import request from 'supertest';
import { createApp } from '../app';
import { getRampTransaction } from '../services/anchor.service';

// Keep fetchAnchorInfo real so the TOML-parsing test exercises actual parsing code.
// Mock only getRampTransaction and startInteractive to avoid SEP-10 auth calls.
jest.mock('../services/anchor.service', () => {
  const actual = jest.requireActual('../services/anchor.service');
  return {
    ...actual,
    getRampTransaction: jest.fn(),
    startInteractive: jest.fn(),
  };
});

const app = createApp();

const FAKE_TOML = `
WEB_AUTH_ENDPOINT = "https://testanchor.stellar.org/auth"
TRANSFER_SERVER_SEP0024 = "https://testanchor.stellar.org/sep24"
SIGNING_KEY = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKWLB6GBKH1GLTQ7MWRS"
NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
`;

// ---------------------------------------------------------------------------
// GET /anchor/info
// ---------------------------------------------------------------------------

describe('GET /anchor/info', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => FAKE_TOML,
    } as unknown as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('fetches stellar.toml, parses WEB_AUTH_ENDPOINT / TRANSFER_SERVER_SEP0024 / SIGNING_KEY and returns 200', async () => {
    const res = await request(app).get('/anchor/info');

    // If any of the three fields is missing from the TOML the service throws
    // and the controller returns 502 — a 200 here proves parsing succeeded.
    expect(res.status).toBe(200);
    expect(res.body.networkPassphrase).toBe('Test SDF Network ; September 2015');
    expect(res.body.homeDomain).toBeTruthy();
    expect(res.body.assetCode).toBeTruthy();
    expect(res.body.name).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// GET /anchor/transaction/:id
// ---------------------------------------------------------------------------

describe('GET /anchor/transaction/:id', () => {
  const mockGetRampTx = getRampTransaction as jest.Mock;

  afterEach(() => {
    mockGetRampTx.mockReset();
  });

  it('returns 200 with the transaction when status is completed', async () => {
    mockGetRampTx.mockResolvedValue({
      id: 'tx-123',
      kind: 'withdrawal',
      status: 'completed',
    });

    const res = await request(app).get('/anchor/transaction/tx-123');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    // No retry: service called exactly once
    expect(mockGetRampTx).toHaveBeenCalledTimes(1);
  });

  it('returns 502 with retry error body after 3 retries when status stays error', async () => {
    // Replace setTimeout with a no-op that fires the callback immediately
    // so the test does not wait 7 real seconds (1s + 2s + 4s backoff).
    const setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((cb: TimerHandler) => {
        (cb as () => void)();
        return 0 as unknown as NodeJS.Timeout;
      });

    mockGetRampTx.mockResolvedValue({
      id: 'tx-err',
      kind: 'withdrawal',
      status: 'error',
      message: 'Anchor internal error',
    });

    const res = await request(app).get('/anchor/transaction/tx-err');

    setTimeoutSpy.mockRestore();

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Anchor reported error after 3 retries');
    expect(res.body.lastStatus).toBe('error');
    expect(res.body.message).toBe('Anchor internal error');
    // 1 initial call + 3 retries
    expect(mockGetRampTx).toHaveBeenCalledTimes(4);
  });
});
