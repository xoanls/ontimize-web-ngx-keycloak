import { KeycloakOptions } from 'keycloak-angular';

import { MultitenantAuthService } from './services/multitenant/multitenant-auth.service';
import { OKeycloakAuthService } from './services/o-keycloak-auth.service';
import { OMultitenantConfig } from './types/o-multitenant-config.type';

export function initializeKeycloak(keycloak: OKeycloakAuthService, options: KeycloakOptions) {
  return () => keycloak.init(options);
}

export function initializeKeycloakMultitenant(multitenantAuthService: MultitenantAuthService, config: OMultitenantConfig) {
  return () => multitenantAuthService.initialize(config);
}