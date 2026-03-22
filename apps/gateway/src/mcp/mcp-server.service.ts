import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceProviderService } from './resource-provider.service';
import { ToolProviderService } from './tool-provider.service';
import { PromptProviderService } from './prompt-provider.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class McpServerService {
  private readonly logger = new Logger(McpServerService.name);

  constructor(
    private readonly resourceProvider: ResourceProviderService,
    private readonly toolProvider: ToolProviderService,
    private readonly promptProvider: PromptProviderService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  createServer(projectSlug: string, userEmail?: string): McpServer {
    const server = new McpServer({
      name: 'mcp-hub',
      version: '1.0.0',
    });

    this.registerResourceHandlers(server, projectSlug);
    this.registerToolHandlers(server, projectSlug);
    this.registerPromptHandlers(server, projectSlug);

    this.logger.log(
      `MCP server created for project="${projectSlug}" user="${userEmail}"`,
    );

    return server;
  }

  private registerResourceHandlers(server: McpServer, projectSlug: string) {
    server.registerResource(
      'project-docs',
      `mcphub://projects/${projectSlug}/docs/[docSlug]`,
      { description: `Documents for project ${projectSlug}` },
      async (uri) => {
        return this.resourceProvider.readResource(uri.toString());
      },
    );
  }

  private registerToolHandlers(server: McpServer, projectSlug: string) {
    // We need to register tools dynamically at connection time
    // Use a meta-tool that lists and calls project tools
    server.registerTool(
      'list-project-tools',
      {
        description: `List all available tools for project ${projectSlug}`,
      },
      async () => {
        const tools = await this.toolProvider.listTools(projectSlug);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(tools, null, 2),
            },
          ],
        };
      },
    );

    server.registerTool(
      'call-project-tool',
      {
        description: `Call a tool from project ${projectSlug}`,
        inputSchema: {
          toolName: { type: 'string', description: 'Name of the tool to call' },
          args: { type: 'object', description: 'Arguments to pass to the tool' },
        } as any,
      },
      async (params: any) => {
        const result = await this.toolProvider.callTool(
          projectSlug,
          params.toolName,
          params.args || {},
        );
        await this.logMcpAction('call-tool', projectSlug, {
          tool: params.toolName,
        });
        return result;
      },
    );
  }

  private registerPromptHandlers(server: McpServer, projectSlug: string) {
    // Register a meta-prompt that lists available prompts
    server.registerTool(
      'list-project-prompts',
      {
        description: `List all available prompts for project ${projectSlug}`,
      },
      async () => {
        const prompts = await this.promptProvider.listPrompts(projectSlug);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(prompts, null, 2),
            },
          ],
        };
      },
    );

    server.registerTool(
      'get-project-prompt',
      {
        description: `Get a compiled prompt from project ${projectSlug}`,
        inputSchema: {
          promptName: { type: 'string', description: 'Name of the prompt' },
          args: {
            type: 'object',
            description: 'Arguments to fill in the prompt template',
          },
        } as any,
      },
      async (params: any) => {
        const result = await this.promptProvider.getPrompt(
          projectSlug,
          params.promptName,
          params.args || {},
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      },
    );
  }

  private async logMcpAction(
    action: string,
    projectSlug: string,
    metadata: Record<string, any>,
  ) {
    try {
      const project = await this.projectRepository.findOne({
        where: { slug: projectSlug },
      });
      if (project) {
        await this.auditRepository.save({
          userId: project.createdById,
          projectId: project.id,
          action: `mcp:${action}`,
          metadata,
        });
      }
    } catch {
      // Don't fail MCP operations if audit logging fails
    }
  }
}
