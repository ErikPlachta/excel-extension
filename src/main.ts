import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

declare const Office: any;

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    try {
      const isExcelHost =
        typeof Office !== 'undefined' &&
        Office.context?.host === Office.HostType?.Excel;
      const isHttps = location.protocol === 'https:';
      const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
      if ('serviceWorker' in navigator && isHttps && !isLocal && !isExcelHost) {
        const swUrl = new URL('sw.js', document.baseURI).toString();
        navigator.serviceWorker.register(swUrl).catch(() => {
          /* noop */
        });
      }
    } catch {
      // Ignore SW registration failures or missing Office globals.
    }
  })
  .catch((err) => console.error(err));
