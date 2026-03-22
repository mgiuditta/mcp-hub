import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { PromptService } from './prompt.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';

@Controller('projects/:slug/prompts')
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Get()
  findAll(@Param('slug') slug: string) {
    return this.promptService.findAll(slug);
  }

  @Get(':promptId')
  findOne(@Param('slug') slug: string, @Param('promptId') promptId: string) {
    return this.promptService.findOne(slug, promptId);
  }

  @Post()
  create(@Param('slug') slug: string, @Body() dto: CreatePromptDto) {
    return this.promptService.create(slug, dto);
  }

  @Put(':promptId')
  update(
    @Param('slug') slug: string,
    @Param('promptId') promptId: string,
    @Body() dto: UpdatePromptDto,
  ) {
    return this.promptService.update(slug, promptId, dto);
  }

  @Delete(':promptId')
  remove(@Param('slug') slug: string, @Param('promptId') promptId: string) {
    return this.promptService.remove(slug, promptId);
  }
}
