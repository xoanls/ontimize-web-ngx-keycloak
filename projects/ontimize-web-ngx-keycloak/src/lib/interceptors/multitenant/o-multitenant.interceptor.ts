import { Injectable, Injector, Type } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { APP_CONFIG, Codes, Config } from 'ontimize-web-ngx';
import { MultitenantAuthService } from '../../services/multitenant/multitenant-auth.service';

@Injectable()
export class OMultitenantInterceptor implements HttpInterceptor {
  private config: Config;
  private multitenantAuthService: MultitenantAuthService;

  constructor(private injector: Injector, private router: Router) {
    this.config = this.injector.get(APP_CONFIG);
    this.multitenantAuthService = this.injector.get<MultitenantAuthService>(MultitenantAuthService as Type<MultitenantAuthService>);
  }

  public intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.startsWith('./assets/')
        || (this.config.assets
          && (req.url.startsWith(this.config.assets.css)
            || req.url.startsWith(this.config.assets.images)
            || req.url.startsWith(this.config.assets.js)
            || (this.config.assets.i18n && req.url.startsWith(this.config.assets.i18n.path))
            ))) {
      return next.handle(req);
    } else {
      let tenantId = this.multitenantAuthService.getTenant();
      let modifiedReq: HttpRequest<any>;

      if (tenantId && tenantId.length > 0 && !req.url.includes(this.multitenantAuthService.getUrl())) {
        modifiedReq = req.clone({
          headers: req.headers.set('X-Tenant', tenantId),
        });
        return next.handle(modifiedReq).pipe((r)=> {
          return r;
        }, catchError((err) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 401 || err.status === 403) {
              this.router.navigate([Codes.LOGIN_ROUTE], {queryParams: {'status' : err.status}});
            }
            return throwError(err);
          }
        }));
      } else {
        return next.handle(req);
      }
    }
  }
}
