import { Injectable } from '@angular/core';
import { AuthService } from 'ontimize-web-ngx';
import { OMultitenantConfig } from '../../types/o-multitenant-config.type';

@Injectable()
export abstract class MultitenantAuthService extends AuthService {
  public abstract getTenant(): string;

  public abstract getUrl(): string;

  public abstract getRealm(): string;

  public abstract getClient(): string;

  public abstract initialize(config: OMultitenantConfig): Promise<void>;
  
  public abstract signIn(tenant: string, redirectUrl?: string, username?: string): Promise<void>;

  public abstract signOut(redirectUrl?: string): Promise<void>;
}
