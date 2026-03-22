import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.projectService.findAll(user);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string, @CurrentUser() user: User) {
    return this.projectService.findBySlug(slug, user);
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: User) {
    return this.projectService.create(dto, user);
  }

  @Put(':slug')
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectService.update(slug, dto, user);
  }

  @Delete(':slug')
  remove(@Param('slug') slug: string, @CurrentUser() user: User) {
    return this.projectService.remove(slug, user);
  }
}
