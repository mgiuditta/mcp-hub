import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPrompt } from '../entities/project-prompt.entity';
import { Project } from '../entities/project.entity';

@Injectable()
export class PromptProviderService {
  constructor(
    @InjectRepository(ProjectPrompt)
    private readonly promptRepository: Repository<ProjectPrompt>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async listPrompts(projectSlug: string) {
    const project = await this.projectRepository.findOne({
      where: { slug: projectSlug, isActive: true },
    });
    if (!project) return [];

    const prompts = await this.promptRepository.find({
      where: { projectId: project.id },
    });

    return prompts.map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments.map((a) => ({
        name: a.name,
        description: a.description,
        required: a.required,
      })),
    }));
  }

  async getPrompt(
    projectSlug: string,
    promptName: string,
    args: Record<string, string>,
  ) {
    const project = await this.projectRepository.findOne({
      where: { slug: projectSlug, isActive: true },
    });
    if (!project) {
      throw new Error(`Project "${projectSlug}" not found`);
    }

    const prompt = await this.promptRepository.findOne({
      where: { projectId: project.id, name: promptName },
    });
    if (!prompt) {
      throw new Error(`Prompt "${promptName}" not found`);
    }

    // Replace {{placeholder}} with values from args
    let text = prompt.template;
    for (const [key, value] of Object.entries(args)) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return {
      description: prompt.description,
      messages: [
        {
          role: 'user' as const,
          content: { type: 'text' as const, text },
        },
      ],
    };
  }
}
