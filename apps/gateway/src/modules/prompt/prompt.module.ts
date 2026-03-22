import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPrompt } from '../../entities/project-prompt.entity';
import { ProjectModule } from '../project/project.module';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectPrompt]), ProjectModule],
  controllers: [PromptController],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
