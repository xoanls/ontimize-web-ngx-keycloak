import { Injectable, Injector, Type } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { KeycloakAuthGuard, KeycloakService } from 'keycloak-angular';
import { Codes, OUserInfoService, PermissionsService } from 'ontimize-web-ngx';
import { MultitenantAuthService } from './multitenant-auth.service';

@Injectable()
export class OKeycloakMultitenantAuthGuardService extends KeycloakAuthGuard {
  protected loginRoute: string;
  protected router: Router;
  protected keycloakService: KeycloakService;
  protected multitenantAuthService: MultitenantAuthService;
  protected oUserInfoService: OUserInfoService;
  protected permissionsService: PermissionsService;

  constructor(injector: Injector) {
    let router = injector.get<Router>(Router as Type<Router>);
    let keycloakService = injector.get<KeycloakService>(KeycloakService as Type<KeycloakService>);

    super(router, keycloakService);

    this.loginRoute = Codes.LOGIN_ROUTE;
    this.router = router;
    this.keycloakService = keycloakService;
    this.multitenantAuthService = injector.get<MultitenantAuthService>(MultitenantAuthService);
    this.oUserInfoService = injector.get<OUserInfoService>(OUserInfoService as Type<OUserInfoService>);
    this.permissionsService = injector.get<PermissionsService>(PermissionsService as Type<PermissionsService>);
  }

  public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    if (this.keycloakService.getKeycloakInstance()) {
      return super.canActivate(route, state);
    } else if (this.loginRoute.startsWith('http')) {
      window.location.href = this.loginRoute + '?redirect=' + encodeURIComponent(state.url);
    } else {
      this.router.navigate([this.loginRoute], { queryParams: { 'redirect': state.url } });
    }
  }

  public isAccessAllowed(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    if (this.authenticated !== true) {
      if (this.loginRoute.startsWith('http')) {
        window.location.href = this.loginRoute + '?redirect=' + encodeURIComponent(state.url);
      } else {
        this.router.navigate([this.loginRoute], {queryParams: {'redirect':state.url}});
      }
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

  protected loadPermissions(): Promise<boolean> {
    if (!this.permissionsService.hasPermissions()) {
      return this.permissionsService.getUserPermissionsAsPromise();
    }
  }
}
