import { KeycloakOptions } from 'keycloak-angular';

import { OKeycloakAuthService } from './services/o-keycloak-auth.service';

export function initializeKeycloak(keycloak: OKeycloakAuthService, options: KeycloakOptions) {
  return () => keycloak.init(options);
}
