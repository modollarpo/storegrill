import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildAuthorizeUrl, fetchToken, fetchProfile, PROVIDER_CONFIGS } from './config.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildAuthorizeUrl', () => {
  it('builds a Google authorize URL with client_id, redirect_uri, response_type, scope and state', () => {
    const url = new URL(buildAuthorizeUrl('google', 'cid', 'https://api.storegrill.net/api/v1/auth/oauth/google/callback', 'rand123'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('redirect_uri')).toBe('https://api.storegrill.net/api/v1/auth/oauth/google/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBe('rand123');
  });

  it('throws for an unknown provider', () => {
    expect(() => buildAuthorizeUrl('nope', 'cid', 'uri', 'state')).toThrow();
  });
});

describe('fetchToken', () => {
  it('POSTs the authorization code to Google and returns the decoded token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'at', expires_in: 3600, refresh_token: 'rt' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const token = await fetchToken(
      'google',
      'code123',
      'https://api.storegrill.net/api/v1/auth/oauth/google/callback',
      'cid',
      'csecret',
    );

    expect(token).toEqual({ access_token: 'at', expires_in: 3600, refresh_token: 'rt' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    const body = new URLSearchParams(init.body);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('code123');
    expect(body.get('client_id')).toBe('cid');
    expect(body.get('client_secret')).toBe('csecret');
    expect(body.get('redirect_uri')).toBe('https://api.storegrill.net/api/v1/auth/oauth/google/callback');
  });

  it('uses GET for Facebook and does not send Content-Type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'at' }) });
    vi.stubGlobal('fetch', fetchMock);

    await fetchToken('facebook', 'code123', 'uri', 'cid', 'csecret');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v19.0/oauth/access_token');
    expect(init.method).toBe('GET');
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('sends Basic auth for LinkedIn', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'at' }) });
    vi.stubGlobal('fetch', fetchMock);

    await fetchToken('linkedin', 'code123', 'uri', 'cid', 'csecret');

    const init = fetchMock.mock.calls[0][1];
    const expectedB64 = Buffer.from('cid:csecret').toString('base64');
    expect(init.headers['Authorization']).toBe(`Basic ${expectedB64}`);
  });

  it('throws with provider and status when the token exchange fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad_redirect_uri' }));
    await expect(fetchToken('google', 'code', 'uri', 'cid', 'csecret')).rejects.toThrow(
      /OAuth token exchange failed for google: 400 bad_redirect_uri/,
    );
  });
});

describe('fetchProfile', () => {
  it('normalizes a Google profile (openid userinfo)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sub: 'g123', email: 'a@b.com', name: 'Ada', picture: 'https://p' }),
      }),
    );

    const profile = await fetchProfile('google', 'at');

    expect(profile).toEqual({ providerId: 'g123', email: 'a@b.com', name: 'Ada', avatar: 'https://p' });
  });

  it('normalizes a Facebook profile and builds the avatar from id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'fb1', name: 'F', email: 'f@b.com' }) }),
    );

    const profile = await fetchProfile('facebook', 'at');

    expect(profile.providerId).toBe('fb1');
    expect(profile.email).toBe('f@b.com');
    expect(profile.avatar).toBe('https://graph.facebook.com/fb1/picture?width=200');
  });

  it('normalizes a LinkedIn profile (given_name + family_name merge)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sub: 'li1', given_name: 'Ada', family_name: 'L', email: 'a@b.com' }),
      }),
    );

    const profile = await fetchProfile('linkedin', 'at');

    expect(profile.providerId).toBe('li1');
    expect(profile.name).toBe('Ada L');
    expect(profile.email).toBe('a@b.com');
  });

  it('throws when the profile endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' }));
    await expect(fetchProfile('google', 'at')).rejects.toThrow(/OAuth profile fetch failed for google: 401/);
  });
});

describe('provider registry', () => {
  it('has entries and scopes for all three providers', () => {
    expect(Object.keys(PROVIDER_CONFIGS).sort()).toEqual(['facebook', 'google', 'linkedin']);
    expect(PROVIDER_CONFIGS.google.scope).toBe('openid email profile');
    expect(PROVIDER_CONFIGS.facebook.scope).toBe('email public_profile');
    expect(PROVIDER_CONFIGS.linkedin.tokenMethod).toBe('POST');
  });
});
