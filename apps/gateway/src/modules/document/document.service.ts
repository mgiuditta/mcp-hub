import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../entities/document.entity';
import { ProjectService } from '../project/project.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly projectService: ProjectService,
  ) {}

  async findAll(slug: string) {
    const project = await this.projectService.getProjectBySlug(slug);
    return this.documentRepository.find({
      where: { projectId: project.id },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(slug: string, docSlug: string) {
    const project = await this.projectService.getProjectBySlug(slug);
    const doc = await this.documentRepository.findOne({
      where: { projectId: project.id, slug: docSlug },
    });
    if (!doc) {
      throw new NotFoundException(`Document "${docSlug}" not found`);
    }
    return doc;
  }

  async create(slug: string, dto: CreateDocumentDto) {
    const project = await this.projectService.getProjectBySlug(slug);

    const existing = await this.documentRepository.findOne({
      where: { projectId: project.id, slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Document slug "${dto.slug}" already exists in this project`);
    }

    const doc = this.documentRepository.create({
      ...dto,
      projectId: project.id,
    });
    return this.documentRepository.save(doc);
  }

  async update(slug: string, docSlug: string, dto: UpdateDocumentDto) {
    const doc = await this.findOne(slug, docSlug);
    Object.assign(doc, dto);
    doc.version += 1;
    return this.documentRepository.save(doc);
  }

  async remove(slug: string, docSlug: string) {
    const doc = await this.findOne(slug, docSlug);
    await this.documentRepository.remove(doc);
  }
}
