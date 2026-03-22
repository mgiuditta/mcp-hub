import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(userId: string, action: string, projectId?: string, metadata?: Record<string, any>) {
    const entry = this.auditRepository.create({
      userId,
      action,
      projectId,
      metadata: metadata ?? {},
    });
    return this.auditRepository.save(entry);
  }

  async findByProject(projectId: string, page = 1, limit = 50) {
    const [items, total] = await this.auditRepository.findAndCount({
      where: { projectId },
      relations: ['user'],
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async findAll(page = 1, limit = 50) {
    const [items, total] = await this.auditRepository.findAndCount({
      relations: ['user'],
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }
}
