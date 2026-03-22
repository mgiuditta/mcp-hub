import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTool, HandlerType } from '../entities/project-tool.entity';
import { Project } from '../entities/project.entity';

@Injectable()
export class ToolProviderService {
  private readonly logger = new Logger(ToolProviderService.name);

  constructor(
    @InjectRepository(ProjectTool)
    private readonly toolRepository: Repository<ProjectTool>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async listTools(projectSlug: string) {
    const project = await this.projectRepository.findOne({
      where: { slug: projectSlug, isActive: true },
    });
    if (!project) return [];

    const tools = await this.toolRepository.find({
      where: { projectId: project.id },
    });

    return tools.map((tool) => ({
      name: `${projectSlug}--${tool.name}`,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool(
    projectSlug: string,
    toolName: string,
    args: Record<string, unknown>,
  ) {
    // Strip project prefix
    const rawName = toolName.startsWith(`${projectSlug}--`)
      ? toolName.slice(projectSlug.length + 2)
      : toolName;

    const project = await this.projectRepository.findOne({
      where: { slug: projectSlug, isActive: true },
    });
    if (!project) {
      return { content: [{ type: 'text' as const, text: `Project "${projectSlug}" not found` }], isError: true };
    }

    const tool = await this.toolRepository.findOne({
      where: { projectId: project.id, name: rawName },
    });
    if (!tool) {
      return { content: [{ type: 'text' as const, text: `Tool "${rawName}" not found` }], isError: true };
    }

    try {
      switch (tool.handlerType) {
        case HandlerType.STATIC_RESPONSE:
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(tool.handlerConfig.response ?? tool.handlerConfig, null, 2),
              },
            ],
          };

        case HandlerType.HTTP_PROXY: {
          const config = tool.handlerConfig;
          const response = await fetch(config.url, {
            method: config.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(config.headers || {}),
            },
            body: config.method === 'GET' ? undefined : JSON.stringify(args),
          });
          const text = await response.text();
          return { content: [{ type: 'text' as const, text }] };
        }

        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown handler type: ${tool.handlerType}` }],
            isError: true,
          };
      }
    } catch (error) {
      this.logger.error(`Tool execution error: ${error}`);
      return {
        content: [{ type: 'text' as const, text: `Error: ${error}` }],
        isError: true,
      };
    }
  }
}
