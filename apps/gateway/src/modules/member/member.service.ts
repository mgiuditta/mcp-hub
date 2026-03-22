import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember, MemberRole } from '../../entities/project-member.entity';
import { User } from '../../entities/user.entity';
import { ProjectService } from '../project/project.service';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly projectService: ProjectService,
  ) {}

  async findAll(slug: string) {
    const project = await this.projectService.getProjectBySlug(slug);
    return this.memberRepository.find({
      where: { projectId: project.id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async add(slug: string, dto: AddMemberDto) {
    const project = await this.projectService.getProjectBySlug(slug);

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new NotFoundException(`User "${dto.email}" not found`);
    }

    const existing = await this.memberRepository.findOne({
      where: { projectId: project.id, userId: user.id },
    });
    if (existing) {
      throw new ConflictException('User is already a member');
    }

    const member = this.memberRepository.create({
      projectId: project.id,
      userId: user.id,
      role: dto.role,
    });
    return this.memberRepository.save(member);
  }

  async updateRole(slug: string, userId: string, role: MemberRole) {
    const project = await this.projectService.getProjectBySlug(slug);

    const member = await this.memberRepository.findOne({
      where: { projectId: project.id, userId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    member.role = role;
    return this.memberRepository.save(member);
  }

  async remove(slug: string, userId: string) {
    const project = await this.projectService.getProjectBySlug(slug);

    const member = await this.memberRepository.findOne({
      where: { projectId: project.id, userId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.memberRepository.remove(member);
  }
}
