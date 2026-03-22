import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTool } from '../../entities/project-tool.entity';
import { ProjectService } from '../project/project.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';

@Injectable()
export class ToolService {
  constructor(
    @InjectRepository(ProjectTool)
    private readonly toolRepository: Repository<ProjectTool>,
    private readonly projectService: ProjectService,
  ) {}

  async findAll(slug: string) {
    const project = await this.projectService.getProjectBySlug(slug);
    return this.toolRepository.find({
      where: { projectId: project.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(slug: string, toolId: string) {
    const project = await this.projectService.getProjectBySlug(slug);
    const tool = await this.toolRepository.findOne({
      where: { id: toolId, projectId: project.id },
    });
    if (!tool) {
      throw new NotFoundException(`Tool "${toolId}" not found`);
    }
    return tool;
  }

  async create(slug: string, dto: CreateToolDto) {
    const project = await this.projectService.getProjectBySlug(slug);
    const tool = this.toolRepository.create({
      ...dto,
      projectId: project.id,
    });
    return this.toolRepository.save(tool);
  }

  async update(slug: string, toolId: string, dto: UpdateToolDto) {
    const tool = await this.findOne(slug, toolId);
    Object.assign(tool, dto);
    return this.toolRepository.save(tool);
  }

  async remove(slug: string, toolId: string) {
    const tool = await this.findOne(slug, toolId);
    await this.toolRepository.remove(tool);
  }
}
