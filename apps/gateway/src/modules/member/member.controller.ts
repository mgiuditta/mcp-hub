import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { MemberRole } from '../../entities/project-member.entity';
import { MemberService } from './member.service';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('projects/:slug/members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  findAll(@Param('slug') slug: string) {
    return this.memberService.findAll(slug);
  }

  @Post()
  add(@Param('slug') slug: string, @Body() dto: AddMemberDto) {
    return this.memberService.add(slug, dto);
  }

  @Put(':userId')
  updateRole(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @Body('role') role: MemberRole,
  ) {
    return this.memberService.updateRole(slug, userId, role);
  }

  @Delete(':userId')
  remove(@Param('slug') slug: string, @Param('userId') userId: string) {
    return this.memberService.remove(slug, userId);
  }
}
