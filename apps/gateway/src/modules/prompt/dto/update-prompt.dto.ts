import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class UpdatePromptDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsArray()
  arguments?: Array<{ name: string; description: string; required: boolean }>;
}
