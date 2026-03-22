import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTool } from '../../entities/project-tool.entity';
import { ProjectModule } from '../project/project.module';
import { ToolController } from './tool.controller';
import { ToolService } from './tool.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectTool]), ProjectModule],
  controllers: [ToolController],
  providers: [ToolService],
  exports: [ToolService],
})
export class ToolModule {}
