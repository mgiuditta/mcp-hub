import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ToolService } from './tool.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';

@Controller('projects/:slug/tools')
export class ToolController {
  constructor(private readonly toolService: ToolService) {}

  @Get()
  findAll(@Param('slug') slug: string) {
    return this.toolService.findAll(slug);
  }

  @Get(':toolId')
  findOne(@Param('slug') slug: string, @Param('toolId') toolId: string) {
    return this.toolService.findOne(slug, toolId);
  }

  @Post()
  create(@Param('slug') slug: string, @Body() dto: CreateToolDto) {
    return this.toolService.create(slug, dto);
  }

  @Put(':toolId')
  update(
    @Param('slug') slug: string,
    @Param('toolId') toolId: string,
    @Body() dto: UpdateToolDto,
  ) {
    return this.toolService.update(slug, toolId, dto);
  }

  @Delete(':toolId')
  remove(@Param('slug') slug: string, @Param('toolId') toolId: string) {
    return this.toolService.remove(slug, toolId);
  }
}
