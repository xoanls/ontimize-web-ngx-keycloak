import { DOCUMENT, LocationStrategy } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, Injector, Type } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { KeycloakEvent, KeycloakEventType, KeycloakService } from 'keycloak-angular';
import { KeycloakConfig, KeycloakInitOptions, KeycloakLoginOptions } from 'keycloak-js';
import { from, Observable } from 'rxjs';
import { AppConfig, Codes, LoginStorageService, Util, SessionInfo } from 'ontimize-web-ngx';
import { MultitenantAuthService } from './multitenant-auth.service';
import { OMultitenantConfig } from '../../types/o-multitenant-config.type';

@Injectable({ providedIn: 'root' })
export class OKeycloakMultitenantAuthService extends MultitenantAuthService {
  protected static APP_TENANTID_KEY = 'tenantId';
  protected static KEYCLOAK_LOGINHINT_KEY = 'keycloak-loginhint';
  protected static KEYCLOAK_PROMT_KEY = 'keycloak-prompt';
  protected static COOKIE_PATH = '/';

  protected domain: string = undefined;
  protected timer: any = undefined;

  protected config: OMultitenantConfig;

  protected httpClient: HttpClient;
  protected keycloakService: KeycloakService;
  protected loginStorageService: LoginStorageService;
  protected locationStrategy: LocationStrategy;
  protected cookieService: CookieService;
  protected appConfig: AppConfig;

  constructor(protected injector: Injector) {
    super(injector);
    this.httpClient = injector.get<HttpClient>(HttpClient as Type<HttpClient>);
    this.keycloakService = injector.get<KeycloakService>(KeycloakService as Type<KeycloakService>);
    this.loginStorageService = injector.get<LoginStorageService>(LoginStorageService as Type<LoginStorageService>);
    this.locationStrategy = injector.get<LocationStrategy>(LocationStrategy);
    this.cookieService = injector.get<CookieService>(CookieService as Type<CookieService>);
    this.appConfig = injector.get<AppConfig>(AppConfig as Type<AppConfig>);

    this.keycloakService.keycloakEvents$.subscribe((e: KeycloakEvent) => {
      if (e.type === KeycloakEventType.OnTokenExpired) {
        this.updateToken();
      } else if (e.type === KeycloakEventType.OnAuthSuccess) {
        this.keycloakService.getToken().then(token => {
          if (token) {
            this.startAutoUpdateToken(4);
            let username = localStorage.getItem(OKeycloakMultitenantAuthService.KEYCLOAK_LOGINHINT_KEY);
            if (username) {
              this.onLoginSuccess(token, username);
            } else {
              this.keycloakService.loadUserProfile().then(profile => {
                localStorage.setItem(OKeycloakMultitenantAuthService.KEYCLOAK_LOGINHINT_KEY, profile.username);
                this.onLoginSuccess(token, profile.username);
              });
            }
          }
        });
      } else if (e.type === KeycloakEventType.OnAuthLogout) {
        if (this.loginStorageService.isLoggedIn()) {
          this.onLogoutSuccess();
          window.location.href = this.getFullUrl('/');
        }
      }
    });
  }

  public getKeycloak(): KeycloakService {
    return this.keycloakService;
  }

  public getTenant(): string {
    return localStorage.getItem(OKeycloakMultitenantAuthService.APP_TENANTID_KEY);
  }

  public getUrl(): string {
    let result = undefined;
    if (this.keycloakService.getKeycloakInstance()) result = this.keycloakService.getKeycloakInstance().authServerUrl;
    return result;
  }

  public getRealm(): string {
    let result = undefined;
    if (this.keycloakService.getKeycloakInstance()) result = this.keycloakService.getKeycloakInstance().realm;
    return result;
  }

  public getClient(): string {
    let result = undefined;
    if (this.keycloakService.getKeycloakInstance()) result = this.keycloakService.getKeycloakInstance().clientId;
    return result;
  }

  public getCurrentUser(): string {
    return localStorage.getItem(OKeycloakMultitenantAuthService.KEYCLOAK_LOGINHINT_KEY);
  }

  public getSessionInfo(): SessionInfo {
    let result = {};
    let kc = this.keycloakService.getKeycloakInstance();
    if (kc) {
      result = {
        id: kc.token,
        user: kc.profile ? kc.profile.username : null
      };
    }
    return result;
  }

  public initialize(config: OMultitenantConfig): Promise<void> {
    this.config = config;
    let sharedTenantId = this.cookieService.get(this.config.sharedTenantKey);
    let tenantId = localStorage.getItem(OKeycloakMultitenantAuthService.APP_TENANTID_KEY);
    let prompt = localStorage.getItem(OKeycloakMultitenantAuthService.KEYCLOAK_PROMT_KEY);
    localStorage.removeItem(OKeycloakMultitenantAuthService.KEYCLOAK_PROMT_KEY);

    return new Promise<void>(async (resolve) => {
      if (window.location.pathname.endsWith(Codes.LOGIN_ROUTE)) {
        resolve();
      } else if (sharedTenantId && (!tenantId || tenantId !== sharedTenantId)) {
        this.signIn(sharedTenantId).catch(err => {
          console.log(err);
        }).finally(() => {
          resolve();
        });
      } else if (tenantId) {
        if (prompt === 'none') {
          // Come back after logging into Keycloak
          this.configure(tenantId).catch(err => {
            console.log(err);
          }).finally(() => {
            resolve();
          });
        } else {
          this.signIn(tenantId).catch(err => {
            console.log(err);
          }).finally(() => {
            resolve();
          });
        }
      } else {
        resolve();
      }
    });
  }

  public clearSessionData(): void {
    if (this.keycloakService.getKeycloakInstance()) {
      this.keycloakService.getKeycloakInstance().clearToken();
    }
  }

  public isLoggedIn(): boolean {
    if (this.keycloakService.getKeycloakInstance()) {
      return !!this.keycloakService.getKeycloakInstance().token;
    } else {
      return false;
    }
  }

  public login(user: string): Observable<void> {
    let tenantId = localStorage.getItem(OKeycloakMultitenantAuthService.APP_TENANTID_KEY);
    if (!tenantId) tenantId = this.cookieService.get(this.config.sharedTenantKey);
    if (tenantId) {
      return from(this.signIn(tenantId, undefined, user));
    } else {
      return new Observable(observer => {
        observer.error('Failed to login: No tenant found');
      });
    }
  }

  public logout(): Observable<void> {
    return from(this.signOut());
  }

  public signIn(tenant: string, redirectUrl?: string, username?: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.configure(tenant).then((autenticated) => {
        this.cookieService.set(this.config.sharedTenantKey, tenant, { path: OKeycloakMultitenantAuthService.COOKIE_PATH, domain: this.getDomain() });
        localStorage.setItem(OKeycloakMultitenantAuthService.APP_TENANTID_KEY, tenant);
        if (username) localStorage.setItem(OKeycloakMultitenantAuthService.KEYCLOAK_LOGINHINT_KEY, username);

        if (autenticated === true) {
          resolve();
        } else {
          let koptions: KeycloakLoginOptions = {};
          if (redirectUrl) koptions.redirectUri = this.getFullUrl(redirectUrl);
          if (username) {
            koptions.loginHint = username;
          } else {
            koptions.prompt = 'none';
            localStorage.setItem(OKeycloakMultitenantAuthService.KEYCLOAK_PROMT_KEY, 'none');
          }
          this.keycloakService.login(koptions).then(() => {
            resolve();
          }, (err) => {
            reject(new Error('Failed to login: ' + err));
          });
        }
      }, (err) => {
        reject(new Error('Failed to login: ' + err));
      });
    });
  }

  public signOut(redirectUrl?: string): Promise<void> {
    this.onLogoutSuccess();

    return new Promise(async (resolve) => {
      if (this.keycloakService.getKeycloakInstance()) {
        let redirectUri = this.getFullUrl(redirectUrl || '/');
        // Fix issue with renamed parameters in newer versions of the Keycloak server
        //this.keycloakService.logout(redirectUri)
        let logoutUrl = this.createLogoutUrl(redirectUri);
        this.keycloakService.clearToken();
        window.location.href = logoutUrl;
      }
      resolve();
    });
  }

  protected getTenantInfo(tenant: string): Promise<any> {
    if (this.config.tenants.hasOwnProperty('entity')) {
      return this.getTenantInfoFromEntityResult(tenant);
    } else {
      return this.getTenantInfoFromDto(tenant);
    }
  }

  protected getTenantInfoFromDto(tenant: string): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      let config = this.config.tenants;
      let configuration = this.appConfig.getServiceConfiguration();
      let servConfig: any = {};
      if (configuration.hasOwnProperty(config.service)) {
        servConfig = configuration[config.service];
      }
      let urlBase = servConfig.urlBase ? servConfig.urlBase : this.appConfig.getConfiguration().apiEndpoint;
      let path = servConfig.path ? servConfig.path : '/tenant';
      let url = `${urlBase}${path}`;
      let params = new HttpParams().set(config.tenantKey, tenant);
      let headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json;charset=UTF-8');
      let options = {
        headers: headers,
        params: params
      };
      this.httpClient.get(url, options).subscribe({
        next: (tenantInfo: any) => {
          if (tenantInfo && Util.isObject(tenantInfo)
            && tenantInfo.hasOwnProperty(config.urlKey)
            && tenantInfo.hasOwnProperty(config.realmKey)
            && tenantInfo.hasOwnProperty(config.clientKey)) {
            resolve({
              url: tenantInfo[config.urlKey],
              realm: tenantInfo[config.realmKey],
              client: tenantInfo[config.clientKey]
            });
          } else {
            reject(new Error('Failed to get the tenant info'));
          }
        }, error: (err) => {
          reject(new Error('Failed to get the tenant info: ' + err));
        }
      });
    });
  }

  protected getTenantInfoFromEntityResult(tenant: string): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      let config = this.config.tenants;
      let configuration = this.appConfig.getServiceConfiguration();
      let servConfig: any = {};
      if (configuration.hasOwnProperty(config.service)) {
        servConfig = configuration[config.service];
      }
      let urlBase = servConfig.urlBase ? servConfig.urlBase : this.appConfig.getConfiguration().apiEndpoint;
      let path = servConfig.path ? servConfig.path : '/tenants';
      let url = `${urlBase}${path}/${config.entity}/search`;
      let filter: object = {};
      filter[config.tenantKey] = tenant;
      let columns = [config.urlKey, config.realmKey, config.clientKey];
      let headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*')
        .set('Content-Type', 'application/json;charset=UTF-8');
      let options = {
        headers: headers
      };
      let body = JSON.stringify({
        filter: filter,
        columns: columns
      });
      this.httpClient.post(url, body, options).subscribe({
        next: (resp: any) => {
          if (resp.code === Codes.ONTIMIZE_SUCCESSFUL_CODE && Util.isDefined(resp.data)
            && resp.data.length === 1 && Util.isObject(resp.data[0])) {
            let tenantInfo = resp.data[0];
            if (tenantInfo.hasOwnProperty(config.urlKey)
              && tenantInfo.hasOwnProperty(config.realmKey)
              && tenantInfo.hasOwnProperty(config.clientKey)) {
              resolve({
                url: tenantInfo[config.urlKey],
                realm: tenantInfo[config.realmKey],
                client: tenantInfo[config.clientKey]
              });
            } else {
              reject(new Error('Failed to parse the tenant info'));
            }
          } else {
            reject(new Error('Failed to get the tenant info'));
          }
        }, error: (err) => {
          reject(new Error('Failed to get the tenant info: ' + err.message));
        }
      });
    });
  }

  protected configure(tenant: string): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      this.getTenantInfo(tenant).then((tenantInfo) => {
        let kc: KeycloakConfig = {
          url: tenantInfo.url,
          realm: tenantInfo.realm,
          clientId: tenantInfo.client
        };

        let kio: KeycloakInitOptions = {};
        kio.checkLoginIframe = false;

        this.keycloakService.init({
          config: kc,
          initOptions: kio,
          enableBearerInterceptor: true,
          loadUserProfileAtStartUp: false,
          bearerExcludedUrls: this.config.ignorePaths
        }).then((resp) => {
          resolve(resp);
        }, (err) => {
          reject(err);
        });
      }, (err) => {
        reject(new Error('Failed to configure Keycloak: ' + err));
      });
    });
  }

  protected createLogoutUrl(redirectUri: string): string {
    let kc = this.keycloakService.getKeycloakInstance();
    let url = new URL(kc.createLogoutUrl());
    url.searchParams.forEach((value, key) => url.searchParams.delete(key));
    url.searchParams.append("client_id", kc.clientId);
    url.searchParams.append("post_logout_redirect_uri", redirectUri);
    if (kc.idToken) url.searchParams.append("id_token_hint", kc.idToken);
    return url.toString();
  }

  protected getDomain(): string {
    if (!this.domain) {
      const document = this.injector.get(DOCUMENT);
      if (document) {
        let hostname = document.location.hostname;
        let list = hostname.split('.');
        if (list.length < 3) {
          this.domain = hostname;
        } else {
          if (list.length > 3) list = list.slice(-3);
          if (['co', 'com'].indexOf(list[1]) < 0) list = list.slice(-2);
          this.domain = list.join('.');
        }
      }
    }
    return this.domain;
  }

  protected getFullUrl(path: string): string {
    let url = path;
    if (!url.startsWith('http')) {
      let basePath = this.locationStrategy.getBaseHref();
      if (basePath.endsWith('/')) basePath = basePath.substring(0, basePath.length - 1);
      url = location.origin + basePath + url;
    }
    return url;
  }

  protected onLoginSuccess(token: string, username: string) {
    let sessionInfo: SessionInfo = {
      id: token,
      user: username
    };
    this.loginStorageService.storeSessionInfo(sessionInfo);
    this.onLogin.next(sessionInfo);
  }

  protected onLogoutSuccess() {
    this.onLogout.next(null);

    this.stopAutoUpdateToken();

    if (this.config?.sharedTenantKey) this.cookieService.delete(this.config.sharedTenantKey, OKeycloakMultitenantAuthService.COOKIE_PATH, this.getDomain());
    localStorage.removeItem(OKeycloakMultitenantAuthService.APP_TENANTID_KEY);
    localStorage.removeItem(OKeycloakMultitenantAuthService.KEYCLOAK_LOGINHINT_KEY);

    this.loginStorageService.sessionExpired();
  }

  protected updateToken() {
    this.keycloakService.updateToken(-1).then(refreshed => {
      if (refreshed) {
        this.keycloakService.getToken().then(token => {
          let sessionInfo: SessionInfo = this.loginStorageService.getSessionInfo();
          if (sessionInfo) {
            sessionInfo.id = token;
            this.loginStorageService.storeSessionInfo(sessionInfo);
          }
        });
      } else {
        console.log('Token not refreshed ' + new Date());
      }
    }, (err) => {
      console.log('Failed to refresh the token: ' + err);
    });
  }

  protected startAutoUpdateToken(minutes: number) {
    if (!this.timer) {
      this.timer = setInterval(() => this.updateToken(), minutes * 60000);
    }
  }

  protected stopAutoUpdateToken() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
