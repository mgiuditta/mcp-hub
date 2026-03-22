import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { Document } from '../../entities/document.entity';
import { ProjectTool } from '../../entities/project-tool.entity';
import { ProjectPrompt } from '../../entities/project-prompt.entity';
import { ProjectMember } from '../../entities/project-member.entity';
import { MockAuthGuard } from './mock-auth.guard';
import { RolesGuard } from './roles.guard';
import { SeedService } from './seed.service';
import { AzureAdService } from './azure-ad.service';
import { McpAuthGuard } from './mcp-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Project,
      Document,
      ProjectTool,
      ProjectPrompt,
      ProjectMember,
    ]),
  ],
  providers: [
    SeedService,
    AzureAdService,
    McpAuthGuard,
    {
      provide: APP_GUARD,
      useClass: MockAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [TypeOrmModule, AzureAdService, McpAuthGuard],
})
export class AuthModule {}
