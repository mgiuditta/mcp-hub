import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Public } from '../modules/auth/public.decorator';
import { McpServerService } from './mcp-server.service';

/**
 * Legacy SSE transport controller (no OAuth).
 * Used for internal/dev connections without auth.
 */
@Public()
@Controller()
export class McpSseController {
  private readonly sessions = new Map<string, SSEServerTransport>();

  constructor(private readonly mcpServerService: McpServerService) {}

  @Get('mcp/sse')
  async handleSse(
    @Query('project') projectSlug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!projectSlug) {
      res.status(400).json({ error: 'Missing project query parameter' });
      return;
    }

    const user = (req as any).user;
    const userEmail = user?.email || (req.headers['x-mock-user-email'] as string);

    const transport = new SSEServerTransport('/api/mcp/messages', res as any);
    this.sessions.set(transport.sessionId, transport);

    const server = this.mcpServerService.createServer(projectSlug, userEmail);

    transport.onclose = () => {
      this.sessions.delete(transport.sessionId);
    };

    await server.connect(transport);
  }

  @Post('mcp/messages')
  async handleMessages(
    @Query('sessionId') sessionId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const transport = this.sessions.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await transport.handlePostMessage(req as any, res as any, req.body);
  }
}
