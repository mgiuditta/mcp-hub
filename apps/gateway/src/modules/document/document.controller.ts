import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Controller('projects/:slug/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  findAll(@Param('slug') slug: string) {
    return this.documentService.findAll(slug);
  }

  @Get(':docSlug')
  findOne(@Param('slug') slug: string, @Param('docSlug') docSlug: string) {
    return this.documentService.findOne(slug, docSlug);
  }

  @Post()
  create(@Param('slug') slug: string, @Body() dto: CreateDocumentDto) {
    return this.documentService.create(slug, dto);
  }

  @Put(':docSlug')
  update(
    @Param('slug') slug: string,
    @Param('docSlug') docSlug: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentService.update(slug, docSlug, dto);
  }

  @Delete(':docSlug')
  remove(@Param('slug') slug: string, @Param('docSlug') docSlug: string) {
    return this.documentService.remove(slug, docSlug);
  }
}
