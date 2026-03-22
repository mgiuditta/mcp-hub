import { IsString, IsOptional, IsEnum, Matches, MaxLength } from 'class-validator';
import { DocumentCategory } from '../../../entities/document.entity';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens',
  })
  slug: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory = DocumentCategory.OTHER;
}
