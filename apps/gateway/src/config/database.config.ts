import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Document } from '../entities/document.entity';
import { ProjectTool } from '../entities/project-tool.entity';
import { ProjectPrompt } from '../entities/project-prompt.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { AuditLog } from '../entities/audit-log.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DATABASE_HOST', 'localhost'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  database: configService.get('DATABASE_NAME', 'mcphub'),
  username: configService.get('DATABASE_USER', 'mcphub'),
  password: configService.get('DATABASE_PASSWORD', 'mcphub_dev'),
  entities: [User, Project, Document, ProjectTool, ProjectPrompt, ProjectMember, AuditLog],
  synchronize: true,
});
