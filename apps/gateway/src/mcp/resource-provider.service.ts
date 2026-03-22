import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { Project } from '../entities/project.entity';

@Injectable()
export class ResourceProviderService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async listResources(projectSlug: string) {
    const project = await this.projectRepository.findOne({
      where: { slug: projectSlug, isActive: true },
    });
    if (!project) return [];

    const docs = await this.documentRepository.find({
      where: { projectId: project.id },
    });

    return docs.map((doc) => ({
      uri: `mcphub://projects/${projectSlug}/docs/${doc.slug}`,
      name: doc.title,
      description: `[${doc.category}] ${doc.title} (v${doc.version})`,
      mimeType: 'text/markdown',
    }));
  }

  async readResource(uri: string) {
    // Parse URI: mcphub://projects/{slug}/docs/{docSlug}
    const match = uri.match(
      /^mcphub:\/\/projects\/([^/]+)\/docs\/([^/]+)$/,
    );
    if (!match) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }

    const [, projectSlug, docSlug] = match;

    const project = await this.projectRepository.findOne({
      where: { slug: projectSlug, isActive: true },
    });
    if (!project) {
      throw new Error(`Project "${projectSlug}" not found`);
    }

    const doc = await this.documentRepository.findOne({
      where: { projectId: project.id, slug: docSlug },
    });
    if (!doc) {
      throw new Error(`Document "${docSlug}" not found`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: doc.content,
        },
      ],
    };
  }
}
