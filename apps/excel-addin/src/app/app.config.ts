import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import {
  AUTH_API_TOKEN,
  AuthApiService,
  AuthApiMockService,
  authInterceptor,
} from "@excel-platform/core/auth";
import {
  OPERATIONS_API_TOKEN,
  OperationsApiService,
  OperationsApiMockService,
  API_CONFIG_TOKEN,
} from "@excel-platform/data/api";
import { environment } from "../environments/environment";
import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),

    // Auth API - real or mock based on environment
    {
      provide: AUTH_API_TOKEN,
      useClass: environment.useRealBackend ? AuthApiService : AuthApiMockService,
    },

    // Operations API - real or mock based on environment
    {
      provide: OPERATIONS_API_TOKEN,
      useClass: environment.useRealBackend ? OperationsApiService : OperationsApiMockService,
    },

    // API configuration for URL building
    {
      provide: API_CONFIG_TOKEN,
      useValue: {
        backendUrl: environment.backendUrl,
        useRealBackend: environment.useRealBackend,
      },
    },
  ],
};
