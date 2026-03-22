import { IsString, IsOptional, IsEnum, IsObject, MaxLength } from 'class-validator';
import { HandlerType } from '../../../entities/project-tool.entity';

export class CreateToolDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsObject()
  inputSchema?: Record<string, any> = {};

  @IsOptional()
  @IsEnum(HandlerType)
  handlerType?: HandlerType = HandlerType.STATIC_RESPONSE;

  @IsOptional()
  @IsObject()
  handlerConfig?: Record<string, any> = {};
}
