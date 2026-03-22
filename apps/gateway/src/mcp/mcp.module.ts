import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../modules/auth/auth.module';
import { Project } from '../entities/project.entity';
import { Document } from '../entities/document.entity';
import { ProjectTool } from '../entities/project-tool.entity';
import { ProjectPrompt } from '../entities/project-prompt.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { McpServerService } from './mcp-server.service';
import { McpSseController } from './mcp-sse.controller';
import { ResourceProviderService } from './resource-provider.service';
import { ToolProviderService } from './tool-provider.service';
import { PromptProviderService } from './prompt-provider.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Project,
      Document,
      ProjectTool,
      ProjectPrompt,
      ProjectMember,
      AuditLog,
    ]),
  ],
  controllers: [McpSseController],
  providers: [
    McpServerService,
    ResourceProviderService,
    ToolProviderService,
    PromptProviderService,
  ],
  exports: [McpServerService],
})
export class McpModule {}
