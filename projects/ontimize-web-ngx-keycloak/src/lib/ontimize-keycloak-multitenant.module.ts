import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { KeycloakAngularModule } from 'keycloak-angular';

import { CookieService } from 'ngx-cookie-service';
import { AuthService } from 'ontimize-web-ngx';
import { O_MULTITENANT_CONFIG } from './tokens/o-multitenant-config.token';
import { OMultitenantInterceptor } from './interceptors/multitenant/o-multitenant.interceptor';
import { MultitenantAuthService } from './services/multitenant/multitenant-auth.service';
import { initializeKeycloakMultitenant } from './util';

@NgModule({
  imports: [CommonModule, KeycloakAngularModule],
  providers: [
    HttpClientModule,
    CookieService,
    { provide: MultitenantAuthService, useExisting: AuthService },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloakMultitenant,
      multi: true,
      deps: [MultitenantAuthService, O_MULTITENANT_CONFIG]
    },
    { provide: HTTP_INTERCEPTORS,
      useClass: OMultitenantInterceptor,
      multi: true
    },
  ]
})
export class OntimizeKeycloakMultitenantModule { }
