import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDatabaseConfig } from '../config/database.config';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Document } from '../entities/document.entity';
import { ProjectTool } from '../entities/project-tool.entity';
import { ProjectPrompt } from '../entities/project-prompt.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { McpServerService } from './mcp-server.service';
import { ResourceProviderService } from './resource-provider.service';
import { ToolProviderService } from './tool-provider.service';
import { PromptProviderService } from './prompt-provider.service';
import { AzureAdService } from '../modules/auth/azure-ad.service';

const entities = [
  User,
  Project,
  Document,
  ProjectTool,
  ProjectPrompt,
  ProjectMember,
  AuditLog,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    TypeOrmModule.forFeature(entities),
  ],
  providers: [
    McpServerService,
    ResourceProviderService,
    ToolProviderService,
    PromptProviderService,
    AzureAdService,
  ],
})
class StdioModule {}

async function main() {
  // Parse CLI args: --project=<slug> [--token=<jwt>] [--user=<email>]
  const args = process.argv.slice(2);
  let projectSlug = '';
  let userEmail = '';
  let token = '';

  for (const arg of args) {
    if (arg.startsWith('--project=')) {
      projectSlug = arg.split('=')[1];
    } else if (arg.startsWith('--user=')) {
      userEmail = arg.split('=')[1];
    } else if (arg.startsWith('--token=')) {
      token = arg.split('=')[1];
    }
  }

  // Also check env var for token (useful for Claude Desktop config)
  if (!token) {
    token = process.env.MCP_AZURE_TOKEN || '';
  }

  if (!projectSlug) {
    console.error(
      'Usage: mcp-stdio --project=<slug> [--token=<azure-jwt>] [--user=<email>]',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(StdioModule, {
    logger: false,
  });

  // Validate Azure AD token if configured
  const azureAdService = app.get(AzureAdService);
  if (azureAdService.isEnabled()) {
    if (!token) {
      console.error(
        'Error: Azure AD is configured. Provide --token=<jwt> or set MCP_AZURE_TOKEN env var.',
      );
      process.exit(1);
    }

    try {
      const payload = await azureAdService.validateToken(token);
      userEmail =
        payload.preferred_username || payload.email || userEmail;
      console.error(`Authenticated as: ${userEmail} (oid: ${payload.oid})`);
    } catch (err) {
      console.error(`Authentication failed: ${err}`);
      process.exit(1);
    }
  }

  const mcpServerService = app.get(McpServerService);
  const server = mcpServerService.createServer(projectSlug, userEmail);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
