import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { stdin, stdout } from 'node:process';
import keytar from 'keytar';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const SERVICE = 'Better AI Mode';
const ISSUER = 'https://auth.openai.com';
const AUTH_URL = `${ISSUER}/api/accounts/authorize`;
const TOKEN_URL = `${ISSUER}/api/accounts/oauth/token`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
const ACCOUNTS = { profile: 'chatgpt-profile', id: 'chatgpt-id-token', access: 'chatgpt-access-token', refresh: 'chatgpt-refresh-token', host: 'host-id' };
const b64 = () => randomBytes(32).toString('base64url');
const write = (message) => { const body = Buffer.from(JSON.stringify(message)); const header = Buffer.alloc(4); header.writeUInt32LE(body.length); stdout.write(Buffer.concat([header, body])); };

async function credentials() {
  const [profileText, idToken, accessToken, refreshToken] = await Promise.all([keytar.getPassword(SERVICE, ACCOUNTS.profile), keytar.getPassword(SERVICE, ACCOUNTS.id), keytar.getPassword(SERVICE, ACCOUNTS.access), keytar.getPassword(SERVICE, ACCOUNTS.refresh)]);
  return profileText && idToken && accessToken && refreshToken ? { ...JSON.parse(profileText), idToken, accessToken, refreshToken } : undefined;
}
async function hostId() { let id = await keytar.getPassword(SERVICE, ACCOUNTS.host); if (!id) { id = `urn:uuid:${randomUUID()}`; await keytar.setPassword(SERVICE, ACCOUNTS.host, id); } return id; }
async function save(record) { const { idToken, accessToken, refreshToken, ...profile } = record; await Promise.all([keytar.setPassword(SERVICE, ACCOUNTS.id, idToken), keytar.setPassword(SERVICE, ACCOUNTS.access, accessToken), keytar.setPassword(SERVICE, ACCOUNTS.refresh, refreshToken)]); await keytar.setPassword(SERVICE, ACCOUNTS.profile, JSON.stringify(profile)); }
async function clear() { await Promise.all(Object.values(ACCOUNTS).map((a) => keytar.deletePassword(SERVICE, a))); }
function open(url) { spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore' }).unref(); }

async function signIn() {
  const prior = await credentials(); const state = b64(); const nonce = b64(); const verifier = b64(); const stableHostId = await hostId();
  const server = createServer(async (request, response) => {
    const callback = new URL(request.url || '/', 'http://127.0.0.1');
    if (callback.pathname !== '/auth/callback' || callback.searchParams.get('state') !== state) return response.writeHead(400).end('Invalid sign-in callback.');
    if (callback.searchParams.get('error')) return response.writeHead(400).end('Sign-in was not completed. You may close this window.');
    const code = callback.searchParams.get('code'); const issuedClientId = callback.searchParams.get('client_id'); const clientId = prior?.clientId || issuedClientId;
    if (!code || !clientId || (!prior && !issuedClientId)) return response.writeHead(400).end('Incomplete sign-in callback.');
    try {
      const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code, code_verifier: verifier, redirect_uri, resource: 'https://api.openai.com/v1' });
      const tokenResponse = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
      if (!tokenResponse.ok) throw new Error('Token exchange failed.');
      const tokens = await tokenResponse.json();
      if (!tokens.access_token || !tokens.refresh_token || !tokens.id_token) throw new Error('Token response incomplete.');
      const verified = await jwtVerify(tokens.id_token, JWKS, { issuer: ISSUER, audience: clientId, requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5 });
      const scopes = (tokens.scope || '').split(' ').filter(Boolean);
      if (verified.payload.nonce !== nonce || typeof verified.payload.sub !== 'string' || !scopes.includes('chatgpt.tokens.use.direct')) throw new Error('Plan authorization validation failed.');
      await save({ issuer: ISSUER, subject: verified.payload.sub, email: typeof verified.payload.email === 'string' ? verified.payload.email : undefined, clientId, idToken: tokens.id_token, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, scopes, expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000, hostId: stableHostId });
      response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end('Better AI Mode is connected. You can close this window.');
    } catch { response.writeHead(500).end('Sign-in could not be completed. You may close this window.'); }
    finally { server.close(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address(); const redirect_uri = `http://127.0.0.1:${port}/auth/callback`;
  const url = new URL(AUTH_URL); url.searchParams.set('client_id', prior?.clientId || 'dynamic_agent_client'); url.searchParams.set('response_type', 'code'); url.searchParams.set('redirect_uri', redirect_uri); url.searchParams.set('scope', 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct'); url.searchParams.set('resource', 'https://api.openai.com/v1'); url.searchParams.set('state', state); url.searchParams.set('nonce', nonce); url.searchParams.set('code_challenge_method', 'S256'); url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url')); url.searchParams.set('ext_agent_host_id', stableHostId);
  if (prior) { url.searchParams.set('id_token_hint', prior.idToken); if (prior.email) url.searchParams.set('login_hint', prior.email); } else url.searchParams.set('agent_name_hint', 'Better AI Mode');
  open(url.toString());
}

let pending = Buffer.alloc(0);
stdin.on('data', (chunk) => { pending = Buffer.concat([pending, chunk]); while (pending.length >= 4) { const size = pending.readUInt32LE(0); if (size > 1024 * 1024 || pending.length < size + 4) return; const request = JSON.parse(pending.subarray(4, size + 4).toString()); pending = pending.subarray(size + 4); void (async () => { try { if (request.op === 'status.get') { const record = await credentials(); write({ type: 'status', requestId: request.requestId, state: record ? 'connected' : 'disconnected', account: record ? { email: record.email } : undefined }); } else if (request.op === 'auth.start') { await signIn(); write({ type: 'auth.started', requestId: request.requestId }); } else if (request.op === 'auth.signOut') { await clear(); write({ type: 'status', requestId: request.requestId, state: 'disconnected' }); } else write({ type: 'error', requestId: request.requestId, message: 'Unsupported operation.' }); } catch { write({ type: 'error', requestId: request.requestId, message: 'Local companion failed.' }); } })(); } });
