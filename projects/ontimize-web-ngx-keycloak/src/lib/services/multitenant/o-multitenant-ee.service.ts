import { HttpHeaders } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { OntimizeEEService } from 'ontimize-web-ngx';
import { MultitenantAuthService } from './multitenant-auth.service';

@Injectable()
export class OMultitenantEEService extends OntimizeEEService {
  private multitenantAuthService: MultitenantAuthService;

  constructor(injector: Injector) {
    super(injector);
    this.multitenantAuthService = injector.get<MultitenantAuthService>(MultitenantAuthService)
  }

  protected buildHeaders(): HttpHeaders {
    let headers = super.buildHeaders();
    let tenantId = this.multitenantAuthService.getTenant();
    if (tenantId && tenantId.length > 0) headers = headers.set('X-Tenant', tenantId);
    return headers;
  }
}