export type OMultitenantConfig = {
  sharedTenantKey: string;
  ignorePaths?: string[];
  tenants: OTenantsConfig;
};

export type OTenantsConfig = {
  service: string;
  entity?: string;
  tenantKey: string;
  urlKey: string;
  realmKey: string;
  clientKey: string;
};