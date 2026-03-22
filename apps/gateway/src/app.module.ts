import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProjectModule } from './modules/project/project.module';
import { MemberModule } from './modules/member/member.module';
import { DocumentModule } from './modules/document/document.module';
import { ToolModule } from './modules/tool/tool.module';
import { PromptModule } from './modules/prompt/prompt.module';
import { AuditModule } from './modules/audit/audit.module';
import { McpModule } from './mcp/mcp.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    AuthModule,
    UserModule,
    ProjectModule,
    MemberModule,
    DocumentModule,
    ToolModule,
    PromptModule,
    AuditModule,
    McpModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
