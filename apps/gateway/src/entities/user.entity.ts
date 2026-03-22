import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  TEAM_LEADER = 'team_leader',
  DEVELOPER = 'developer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255 })
  displayName: string;

  @Column({ length: 255, nullable: true })
  azureOid: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.DEVELOPER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;
}
