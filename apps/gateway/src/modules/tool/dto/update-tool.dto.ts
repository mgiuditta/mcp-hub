import { IsString, IsOptional, IsEnum, IsObject, MaxLength } from 'class-validator';
import { HandlerType } from '../../../entities/project-tool.entity';

export class UpdateToolDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  inputSchema?: Record<string, any>;

  @IsOptional()
  @IsEnum(HandlerType)
  handlerType?: HandlerType;

  @IsOptional()
  @IsObject()
  handlerConfig?: Record<string, any>;
}
