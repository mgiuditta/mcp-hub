import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupMcpHttpTransport } from './mcp/mcp-http.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Mount OAuth-protected MCP endpoint at /mcp (outside /api prefix)
  setupMcpHttpTransport(app);

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
