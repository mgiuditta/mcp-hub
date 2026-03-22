import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

export enum HandlerType {
  HTTP_PROXY = 'http_proxy',
  STATIC_RESPONSE = 'static_response',
}

@Entity('project_tools')
export class ProjectTool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.tools, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  inputSchema: Record<string, any>;

  @Column({
    type: 'enum',
    enum: HandlerType,
    default: HandlerType.STATIC_RESPONSE,
  })
  handlerType: HandlerType;

  @Column({ type: 'jsonb', default: {} })
  handlerConfig: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
