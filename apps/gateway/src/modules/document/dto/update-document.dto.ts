import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { DocumentCategory } from '../../../entities/document.entity';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;
}
