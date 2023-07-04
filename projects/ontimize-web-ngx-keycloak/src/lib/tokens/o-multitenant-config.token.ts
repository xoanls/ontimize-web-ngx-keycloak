import { InjectionToken } from '@angular/core';
import { OMultitenantConfig } from '../types/o-multitenant-config.type';

export const O_MULTITENANT_CONFIG = new InjectionToken<OMultitenantConfig>('Multitenant configuration');
