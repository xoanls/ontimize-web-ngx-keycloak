import { Injectable, Injector, Type } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { KeycloakService, KeycloakAuthGuard } from 'keycloak-angular';
import { Codes, PermissionsService, OUserInfoService } from 'ontimize-web-ngx';
import { MultitenantAuthService } from './multitenant-auth.service';

@Injectable()
export class OKeycloakMultitenantAuthGuardService extends KeycloakAuthGuard {
  protected router: Router;
  protected keycloakService: KeycloakService;
  protected multitenantAuthService: MultitenantAuthService;
  protected oUserInfoService: OUserInfoService;
  protected permissionsService: PermissionsService;

  constructor(injector: Injector) {
    let router = injector.get<Router>(Router as Type<Router>);
    let keycloakService = injector.get<KeycloakService>(KeycloakService as Type<KeycloakService>);

    super(router, keycloakService);

    this.router = router;
    this.keycloakService = keycloakService;
    this.multitenantAuthService = injector.get<MultitenantAuthService>(MultitenantAuthService as Type<MultitenantAuthService>)
    this.oUserInfoService = injector.get<OUserInfoService>(OUserInfoService as Type<OUserInfoService>);
    this.permissionsService = injector.get<PermissionsService>(PermissionsService as Type<PermissionsService>);
  }

  public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    if (this.keycloakService.getKeycloakInstance()) {
      return super.canActivate(route, state);
    } else {
      this.router.navigate([Codes.LOGIN_ROUTE], {queryParams: {'redirect':state.url}});
    }
  }

  public isAccessAllowed(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    if (this.authenticated !== true) {
      this.router.navigate([Codes.LOGIN_ROUTE], {queryParams: {'redirect':state.url}});
      return;
    }
    return new Promise(async (resolve) => {
      let granted = false;

      await this.loadPermissions();

      let requiredRoles = route.data.roles;
      if (!requiredRoles || requiredRoles.length === 0) {
        granted = true;
      } else {
        for (let requiredRole of requiredRoles) {
          if (this.roles.indexOf(requiredRole) >= 0) {
            granted = true;
            break;
          }
        }
      }

      if (granted === true) {
        this.setUserInformation();
      } else {
        this.router.navigate(['/']);
      }
      resolve(granted);
    });
  }

  protected setUserInformation() {
    const sessionInfo = this.multitenantAuthService.getSessionInfo();
    // TODO query user information
    this.oUserInfoService.setUserInfo({
      username: sessionInfo.user,
      avatar: './assets/images/user_profile.png'
    });
  }

  private loadPermissions(): Promise<boolean> {
    if (!this.permissionsService.hasPermissions()) {
      return this.permissionsService.getUserPermissionsAsPromise();
    }
  }
}
