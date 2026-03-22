import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { ProjectMember, MemberRole } from '../../entities/project-member.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
  ) {}

  async findAll(user: User) {
    if (user.role === UserRole.ADMIN) {
      return this.projectRepository.find({
        where: { isActive: true },
        order: { updatedAt: 'DESC' },
      });
    }

    const memberships = await this.memberRepository.find({
      where: { userId: user.id },
      relations: ['project'],
    });

    return memberships
      .map((m) => m.project)
      .filter((p) => p.isActive);
  }

  async findBySlug(slug: string, user: User) {
    const project = await this.projectRepository.findOne({
      where: { slug, isActive: true },
      relations: ['documents', 'tools', 'prompts', 'members'],
    });

    if (!project) {
      throw new NotFoundException(`Project "${slug}" not found`);
    }

    await this.assertAccess(project, user);

    return {
      ...project,
      documentsCount: project.documents?.length ?? 0,
      toolsCount: project.tools?.length ?? 0,
      promptsCount: project.prompts?.length ?? 0,
      membersCount: project.members?.length ?? 0,
      documents: undefined,
      tools: undefined,
      prompts: undefined,
      members: undefined,
    };
  }

  async create(dto: CreateProjectDto, user: User) {
    const existing = await this.projectRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" already exists`);
    }

    const project = this.projectRepository.create({
      ...dto,
      createdById: user.id,
    });
    const saved = await this.projectRepository.save(project);

    // Auto-create owner membership
    const membership = this.memberRepository.create({
      projectId: saved.id,
      userId: user.id,
      role: MemberRole.OWNER,
    });
    await this.memberRepository.save(membership);

    return saved;
  }

  async update(slug: string, dto: UpdateProjectDto, user: User) {
    const project = await this.projectRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!project) {
      throw new NotFoundException(`Project "${slug}" not found`);
    }

    await this.assertOwnerOrAdmin(project, user);

    Object.assign(project, dto);
    return this.projectRepository.save(project);
  }

  async remove(slug: string, user: User) {
    const project = await this.projectRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!project) {
      throw new NotFoundException(`Project "${slug}" not found`);
    }

    await this.assertOwnerOrAdmin(project, user);

    project.isActive = false;
    return this.projectRepository.save(project);
  }

  async getProjectBySlug(slug: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { slug, isActive: true },
    });
    if (!project) {
      throw new NotFoundException(`Project "${slug}" not found`);
    }
    return project;
  }

  private async assertAccess(project: Project, user: User) {
    if (user.role === UserRole.ADMIN) return;

    const membership = await this.memberRepository.findOne({
      where: { projectId: project.id, userId: user.id },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this project');
    }
  }

  private async assertOwnerOrAdmin(project: Project, user: User) {
    if (user.role === UserRole.ADMIN) return;

    const membership = await this.memberRepository.findOne({
      where: { projectId: project.id, userId: user.id },
    });

    if (!membership || membership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only owner or admin can perform this action');
    }
  }
}
