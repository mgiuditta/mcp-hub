import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { MemberRole } from '../../../entities/project-member.entity';

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole = MemberRole.MEMBER;
}
