import { CommonModule } from '@angular/common';
import { APP_INITIALIZER, InjectionToken, NgModule } from '@angular/core';
import { KeycloakAngularModule, KeycloakOptions } from 'keycloak-angular';

import { OKeycloakAuthService } from './services/o-keycloak-auth.service';
import { initializeKeycloak } from './util';

export const O_KEYCLOAK_OPTIONS = new InjectionToken<KeycloakOptions>('Keycloak options');

@NgModule({
  imports: [CommonModule, KeycloakAngularModule],
  providers: [
    OKeycloakAuthService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi: true,
      deps: [OKeycloakAuthService, O_KEYCLOAK_OPTIONS]
    }
  ]
})
export class OntimizeKeycloakModule { }
