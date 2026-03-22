import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { AzureAdService } from './azure-ad.service';

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private readonly azureAdService: AzureAdService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // If Azure AD is not configured, allow unauthenticated access (dev mode)
    if (!this.azureAdService.isEnabled()) {
      return true;
    }

    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authHeader.slice(7);
    const payload = await this.azureAdService.validateToken(token);

    // Find or create user from Azure AD claims
    const email =
      payload.preferred_username || payload.email || `${payload.oid}@azure`;
    let user = await this.userRepository.findOne({
      where: { azureOid: payload.oid },
    });

    if (!user) {
      // Try by email
      user = await this.userRepository.findOne({ where: { email } });
      if (user) {
        // Link existing user to Azure AD
        user.azureOid = payload.oid;
        await this.userRepository.save(user);
      }
    }

    if (!user) {
      throw new UnauthorizedException(
        `No user account linked to Azure AD identity: ${email}`,
      );
    }

    request.user = user;
    return true;
  }
}
