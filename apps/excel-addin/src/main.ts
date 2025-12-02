import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { appConfig } from "./app/app.config";

// Office is injected by the Excel/Office runtime; we intentionally
// keep this as any and guard access via runtime checks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Office: any;

function bootstrapAngular(): void {
  bootstrapApplication(AppComponent, appConfig)
    .then(() => {
      try {
        const isExcelHost =
          typeof Office !== "undefined" && Office.context?.host === Office.HostType?.Excel;
        const isHttps = location.protocol === "https:";
        const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
        if ("serviceWorker" in navigator && isHttps && !isLocal && !isExcelHost) {
          const swUrl = new URL("sw.js", document.baseURI).toString();
          navigator.serviceWorker.register(swUrl).catch(() => {
            /* noop */
          });
        }
      } catch {
        // Ignore SW registration failures or missing Office globals.
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .catch((err: any) => console.error(err));
}

// If running inside Office, wait for Office.onReady before
// bootstrapping Angular so that Excel APIs are safe to call.
if (typeof Office !== "undefined" && typeof Office.onReady === "function") {
  Office.onReady().then(() => {
    bootstrapAngular();
  });
} else {
  bootstrapAngular();
}
