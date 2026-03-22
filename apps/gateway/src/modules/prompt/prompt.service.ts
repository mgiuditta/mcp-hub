import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPrompt } from '../../entities/project-prompt.entity';
import { ProjectService } from '../project/project.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';

@Injectable()
export class PromptService {
  constructor(
    @InjectRepository(ProjectPrompt)
    private readonly promptRepository: Repository<ProjectPrompt>,
    private readonly projectService: ProjectService,
  ) {}

  async findAll(slug: string) {
    const project = await this.projectService.getProjectBySlug(slug);
    return this.promptRepository.find({
      where: { projectId: project.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(slug: string, promptId: string) {
    const project = await this.projectService.getProjectBySlug(slug);
    const prompt = await this.promptRepository.findOne({
      where: { id: promptId, projectId: project.id },
    });
    if (!prompt) {
      throw new NotFoundException(`Prompt "${promptId}" not found`);
    }
    return prompt;
  }

  async create(slug: string, dto: CreatePromptDto) {
    const project = await this.projectService.getProjectBySlug(slug);
    const prompt = this.promptRepository.create({
      ...dto,
      projectId: project.id,
    });
    return this.promptRepository.save(prompt);
  }

  async update(slug: string, promptId: string, dto: UpdatePromptDto) {
    const prompt = await this.findOne(slug, promptId);
    Object.assign(prompt, dto);
    return this.promptRepository.save(prompt);
  }

  async remove(slug: string, promptId: string) {
    const prompt = await this.findOne(slug, promptId);
    await this.promptRepository.remove(prompt);
  }
}
