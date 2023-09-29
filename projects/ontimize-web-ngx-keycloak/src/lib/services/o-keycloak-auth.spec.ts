import { TestBed, inject } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';

import { OKeycloakAuthService } from './o-keycloak-auth.service';
import { KeycloakService } from 'keycloak-angular';

describe('OKeycloakAuthService', () => {
  let service: OKeycloakAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OKeycloakAuthService, KeycloakService],
      imports: [MatDialogModule]
    });
  });
  it('should be created', inject(
    [OKeycloakAuthService],
    (service: OKeycloakAuthService) => {
      expect(service).toBeTruthy();
    }
  ));
});