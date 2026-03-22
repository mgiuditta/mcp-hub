import { randomUUID, randomBytes } from 'crypto';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { Response } from 'express';

/**
 * Mock OAuth provider for development.
 * Shows a user-selection page instead of Azure AD login.
 * Replace with AzureAdOAuthProvider for production.
 */

const MOCK_USERS = [
  { email: 'admin@mcphub.local', name: 'Admin User' },
  { email: 'leader@mcphub.local', name: 'Team Leader' },
  { email: 'dev@mcphub.local', name: 'Developer' },
];

// In-memory stores
const clients = new Map<string, OAuthClientInformationFull>();
const authCodes = new Map<
  string,
  {
    clientId: string;
    email: string;
    codeChallenge: string;
    redirectUri: string;
  }
>();
const accessTokens = new Map<
  string,
  { clientId: string; email: string; expiresAt: number }
>();

export class MockClientsStore implements OAuthRegisteredClientsStore {
  async getClient(
    clientId: string,
  ): Promise<OAuthClientInformationFull | undefined> {
    return clients.get(clientId);
  }

  async registerClient(
    client: Omit<
      OAuthClientInformationFull,
      'client_id' | 'client_id_issued_at'
    >,
  ): Promise<OAuthClientInformationFull> {
    const full: OAuthClientInformationFull = {
      ...client,
      client_id: randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    clients.set(full.client_id, full);
    return full;
  }
}

export class MockOAuthProvider implements OAuthServerProvider {
  clientsStore = new MockClientsStore();

  async authorize(
    client: OAuthClientInformationFull,
    params: {
      state?: string;
      scopes?: string[];
      codeChallenge: string;
      redirectUri: string;
    },
    res: Response,
  ): Promise<void> {
    // Render a simple HTML user-selection page
    const userButtons = MOCK_USERS.map(
      (u) =>
        `<button type="submit" name="email" value="${u.email}"
          style="display:block;width:100%;padding:12px;margin:8px 0;font-size:16px;cursor:pointer;border:1px solid #ccc;border-radius:6px;background:#fff;">
          ${u.name} <span style="color:#888">(${u.email})</span>
        </button>`,
    ).join('\n');

    const html = `<!DOCTYPE html>
<html><head><title>MCP Hub — Login</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
.card{background:#fff;padding:32px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;width:100%}
h2{margin:0 0 8px;font-size:20px}p{color:#666;margin:0 0 20px;font-size:14px}</style></head>
<body><div class="card">
<h2>MCP Hub — Seleziona Utente</h2>
<p>Client: ${client.client_name || client.client_id}</p>
<form method="POST">
  <input type="hidden" name="client_id" value="${client.client_id}" />
  <input type="hidden" name="state" value="${params.state || ''}" />
  <input type="hidden" name="code_challenge" value="${params.codeChallenge}" />
  <input type="hidden" name="redirect_uri" value="${params.redirectUri}" />
  ${userButtons}
</form>
</div></body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  }

  async handleAuthorizationPost(
    body: Record<string, string>,
    res: Response,
  ): Promise<void> {
    const { client_id, email, state, code_challenge, redirect_uri } = body;

    const code = randomBytes(32).toString('hex');
    authCodes.set(code, {
      clientId: client_id,
      email,
      codeChallenge: code_challenge,
      redirectUri: redirect_uri,
    });

    const url = new URL(redirect_uri);
    url.searchParams.set('code', code);
    if (state) url.searchParams.set('state', state);

    res.redirect(302, url.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const stored = authCodes.get(authorizationCode);
    if (!stored) throw new Error('Invalid authorization code');
    return stored.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<OAuthTokens> {
    const stored = authCodes.get(authorizationCode);
    if (!stored || stored.clientId !== client.client_id) {
      throw new Error('Invalid authorization code');
    }

    authCodes.delete(authorizationCode);

    const token = randomBytes(48).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    accessTokens.set(token, {
      clientId: client.client_id,
      email: stored.email,
      expiresAt,
    });

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
    };
  }

  async exchangeRefreshToken(): Promise<OAuthTokens> {
    throw new Error('Refresh tokens not supported in mock provider');
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const stored = accessTokens.get(token);
    if (!stored) {
      throw new Error('Invalid access token');
    }

    if (stored.expiresAt < Math.floor(Date.now() / 1000)) {
      accessTokens.delete(token);
      throw new Error('Token expired');
    }

    return {
      token,
      clientId: stored.clientId,
      scopes: [],
      expiresAt: stored.expiresAt,
      extra: { email: stored.email },
    };
  }
}
