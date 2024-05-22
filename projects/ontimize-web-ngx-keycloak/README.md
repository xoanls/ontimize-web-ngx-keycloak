# OntimizeWebNgxKeycloak

This library helps to use Keycloak in OntimizeWeb applications. It provides  the implementation of the authentication service from [ontimize-web-ngx](https://github.com/OntimizeWeb/ontimize-web-ngx) using [keycloak-angular](https://www.npmjs.com/package/keycloak-angular).

## Installation

Run the following command in order to install OntimizeWeb Keycloak library:

```sh
npm install ontimize-web-ngx-keycloak
```

## Setup

In order use Keycloak as the default authentication implementation for your OntimizeWeb application you should provide the `OKeycloakAuthService` using the injection token `O_AUTH_SERVICE` in your `AppModule`. You have to provide also the configuration for Keycloak using the injection token `O_KEYCLOAK_OPTIONS`.

Use the code provided below as an example. In this process ensure that the configuration you are providing matches that of your client as configured in Keycloak.

```ts
import { KeycloakOptions, O_KEYCLOAK_OPTIONS, OKeycloakAuthService, OntimizeKeycloakModule } from 'ontimize-web-ngx-keycloak';
import { AppComponent } from './app.component';

const keycloakOptions: KeycloakOptions = {
  config: {
    url: 'http://localhost:8080/auth',
    realm: 'your-realm',
    clientId: 'your-client-id'
  },
  initOptions: {
    onLoad: 'login-required'
  }
};

@NgModule({
  imports: [
    ...
    OntimizeKeycloakModule
  ],
  ...
  providers: [
    { provide: O_AUTH_SERVICE, useValue: OKeycloakAuthService },
    { provide: O_KEYCLOAK_OPTIONS, useValue: keycloakOptions }
  ],
})
export class AppModule { }
```

If you want to know more about these options and various other capabilities of the Keycloak client is recommended to read the [JavaScript Adapter documentation](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter).

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

