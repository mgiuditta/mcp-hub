import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreatePromptDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  description: string;

  @IsString()
  template: string;

  @IsOptional()
  @IsArray()
  arguments?: Array<{ name: string; description: string; required: boolean }> = [];
}
