import type { INestApplication } from '@nestjs/common';
import type { Express, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { MockOAuthProvider } from './oauth/mock-oauth-provider.js';
import { McpServerService } from './mcp-server.service';

/**
 * Sets up the OAuth-protected MCP endpoint at /mcp.
 * Mounts Express middleware outside of NestJS routing.
 *
 * Flow:
 * 1. Client discovers OAuth metadata at /.well-known/oauth-authorization-server
 * 2. Client registers dynamically via /authorize + /token
 * 3. Client opens browser → user selects identity (mock) or logs in (Azure AD)
 * 4. Client receives Bearer token
 * 5. Client connects to POST /mcp with Bearer token
 */
export function setupMcpHttpTransport(app: INestApplication) {
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  const mcpServerService = app.get(McpServerService);

  const provider = new MockOAuthProvider();

  const port = process.env.PORT || '3001';
  const issuerUrl = new URL(
    process.env.MCP_ISSUER_URL || `http://localhost:${port}`,
  );

  // Mount OAuth endpoints (/.well-known/*, /authorize, /token, /register)
  expressApp.use(
    mcpAuthRouter({
      provider,
      issuerUrl,
      baseUrl: issuerUrl,
      serviceDocumentationUrl: new URL('/api', issuerUrl),
    }),
  );

  // Handle POST /authorize (form submission from login page)
  expressApp.post('/authorize', async (req: Request, res: Response) => {
    await provider.handleAuthorizationPost(req.body, res);
  });

  // Auth middleware for the /mcp endpoint
  const bearerAuth = requireBearerAuth({ verifier: provider });

  // Session store for StreamableHTTP
  const sessions = new Map<
    string,
    { transport: StreamableHTTPServerTransport; server: McpServer }
  >();

  // MCP endpoint — handles POST (messages + init), GET (SSE stream), DELETE (close)
  expressApp.all(
    '/mcp',
    // Apply bearer auth
    (req: Request, res: Response, next: NextFunction) => {
      bearerAuth(req, res, next);
    },
    async (req: Request, res: Response) => {
      const authInfo = (req as any).auth;
      const userEmail = authInfo?.extra?.email as string | undefined;

      // Extract project from query or header
      const projectSlug =
        (req.query.project as string) ||
        (req.headers['x-mcp-project'] as string);

      if (req.method === 'POST') {
        // Check if this is an initialization request
        const body = req.body;
        const isInit =
          body?.method === 'initialize' ||
          (!req.headers['mcp-session-id'] && body?.method);

        if (isInit) {
          if (!projectSlug) {
            res.status(400).json({
              error: 'Missing project query parameter or X-MCP-Project header',
            });
            return;
          }

          const sessionId = randomUUID();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => sessionId,
          });
          const server = mcpServerService.createServer(
            projectSlug,
            userEmail,
          );

          sessions.set(sessionId, { transport, server });

          transport.onclose = () => {
            sessions.delete(sessionId);
          };

          await server.connect(transport);
          await transport.handleRequest(req, res, body);
          return;
        }

        // Existing session
        const sessionId = req.headers['mcp-session-id'] as string;
        const session = sessions.get(sessionId);
        if (!session) {
          res.status(404).json({ error: 'Session not found' });
          return;
        }

        await session.transport.handleRequest(req, res, body);
        return;
      }

      if (req.method === 'GET') {
        // SSE stream for existing session
        const sessionId = req.headers['mcp-session-id'] as string;
        const session = sessions.get(sessionId);
        if (!session) {
          res.status(404).json({ error: 'Session not found' });
          return;
        }
        await session.transport.handleRequest(req, res);
        return;
      }

      if (req.method === 'DELETE') {
        const sessionId = req.headers['mcp-session-id'] as string;
        const session = sessions.get(sessionId);
        if (session) {
          await session.transport.close();
          sessions.delete(sessionId);
        }
        res.status(204).end();
        return;
      }

      res.status(405).json({ error: 'Method not allowed' });
    },
  );
}
