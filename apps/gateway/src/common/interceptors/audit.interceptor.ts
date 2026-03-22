import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutating operations
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    if (!user) {
      return next.handle();
    }

    const action = `${method} ${request.route?.path || request.url}`;
    const slug = request.params?.slug;

    return next.handle().pipe(
      tap(async () => {
        try {
          // Resolve projectId from slug if available
          let projectId: string | undefined;
          if (slug) {
            // Try to get projectId from response or params
            const project = await this.getProjectId(request);
            projectId = project;
          }

          await this.auditService.log(user.id, action, projectId, {
            params: request.params,
            body: request.body,
          });
        } catch {
          // Don't fail the request if audit logging fails
        }
      }),
    );
  }

  private async getProjectId(request: any): Promise<string | undefined> {
    // The project ID might be set by the service layer
    // For now, we store the slug in metadata and resolve later
    return undefined;
  }
}
