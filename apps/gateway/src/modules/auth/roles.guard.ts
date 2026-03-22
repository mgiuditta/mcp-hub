import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES_KEY } from './roles.decorator';
import { ProjectMember } from '../../entities/project-member.entity';
import { User, UserRole } from '../../entities/user.entity';

const GLOBAL_ROLES = Object.values(UserRole) as string[];
const PROJECT_ROLES = ['owner', 'member', 'viewer'];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException();
    }

    // Check global roles (admin, team_leader, developer)
    const globalMatch = requiredRoles.some(
      (role) => GLOBAL_ROLES.includes(role) && user.role === role,
    );
    if (globalMatch) {
      return true;
    }

    // Check project-level roles (owner, member, viewer)
    const projectRolesRequired = requiredRoles.filter((r) =>
      PROJECT_ROLES.includes(r),
    );
    if (projectRolesRequired.length === 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const slug = request.params.slug;
    if (!slug) {
      throw new ForbiddenException('Project slug required');
    }

    const membership = await this.memberRepository.findOne({
      where: { userId: user.id, project: { slug } },
      relations: ['project'],
    });

    if (!membership || !projectRolesRequired.includes(membership.role)) {
      throw new ForbiddenException('Insufficient project permissions');
    }

    return true;
  }
}
