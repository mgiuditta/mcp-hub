import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '../../entities/project-member.entity';
import { User } from '../../entities/user.entity';
import { ProjectModule } from '../project/project.module';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectMember, User]),
    ProjectModule,
  ],
  controllers: [MemberController],
  providers: [MemberService],
})
export class MemberModule {}
