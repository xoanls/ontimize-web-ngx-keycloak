import { Injectable, Injector } from '@angular/core';
import { KeycloakOptions, KeycloakService } from 'keycloak-angular';
import { AuthService, SessionInfo } from 'ontimize-web-ngx';
import { from, Observable } from 'rxjs';

@Injectable()
export class OKeycloakAuthService extends AuthService {

  public keycloakService: KeycloakService;

  constructor(protected injector: Injector) {
    super(injector);
    this.keycloakService = this.injector.get(KeycloakService);
  }

  init(options: KeycloakOptions): Promise<boolean> {
    return this.keycloakService.init(options);
  }

  login(): Observable<void> {
    return from(this.keycloakService.login());
  }

  logout(): Observable<void> {
    return from(this.keycloakService.logout());
  }

  clearSessionData(): void {
    this.keycloakService.getKeycloakInstance().clearToken();
  }

  isLoggedIn(): boolean {
    // return this.keycloakService.isLoggedIn();
    return !!this.keycloakService.getKeycloakInstance().token;
  }

  getSessionInfo(): SessionInfo {
    const kc = this.keycloakService.getKeycloakInstance();
    return {
      id: kc.token,
      user: kc.profile ? kc.profile.username : null
    };
  }

}
