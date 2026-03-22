import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';

export interface AzureAdTokenPayload {
  oid: string; // Azure Object ID
  preferred_username?: string;
  email?: string;
  name?: string;
  sub: string;
  tid: string; // Tenant ID
  roles?: string[];
}

@Injectable()
export class AzureAdService {
  private readonly logger = new Logger(AzureAdService.name);
  private readonly jwksClient: jwksRsa.JwksClient | null;
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.tenantId = this.configService.get('AZURE_AD_TENANT_ID', '');
    this.clientId = this.configService.get('AZURE_AD_CLIENT_ID', '');
    this.enabled = !!(this.tenantId && this.clientId);

    if (this.enabled) {
      this.jwksClient = jwksRsa.default({
        jwksUri: `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`,
        cache: true,
        cacheMaxAge: 600000, // 10 minutes
        rateLimit: true,
      });
      this.logger.log('Azure AD authentication enabled');
    } else {
      this.jwksClient = null;
      this.logger.warn(
        'Azure AD not configured (AZURE_AD_TENANT_ID / AZURE_AD_CLIENT_ID missing). MCP endpoints unprotected.',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async validateToken(token: string): Promise<AzureAdTokenPayload> {
    if (!this.enabled || !this.jwksClient) {
      throw new UnauthorizedException('Azure AD not configured');
    }

    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header.kid) {
        throw new UnauthorizedException('Invalid token format');
      }

      const key = await this.jwksClient.getSigningKey(decoded.header.kid);
      const signingKey = key.getPublicKey();

      const payload = jwt.verify(token, signingKey, {
        audience: this.clientId,
        issuer: [
          `https://login.microsoftonline.com/${this.tenantId}/v2.0`,
          `https://sts.windows.net/${this.tenantId}/`,
        ],
        algorithms: ['RS256'],
      }) as AzureAdTokenPayload;

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`Token validation failed: ${error}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
