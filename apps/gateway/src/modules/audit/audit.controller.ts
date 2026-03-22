import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ProjectService } from '../project/project.service';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly projectService: ProjectService,
  ) {}

  @Get('projects/:slug/audit')
  async findByProject(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const project = await this.projectService.getProjectBySlug(slug);
    return this.auditService.findByProject(
      project.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('audit')
  @Roles('admin')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }
}
