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

export enum DocumentCategory {
  ARCHITECTURE = 'architecture',
  API = 'api',
  CONVENTION = 'convention',
  README = 'readme',
  OTHER = 'other',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 100 })
  slug: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: DocumentCategory,
    default: DocumentCategory.OTHER,
  })
  category: DocumentCategory;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
