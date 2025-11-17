import { Injectable } from "@angular/core";
import { ExcelService } from "./excel.service";
import { AuthService } from "./auth.service";

export interface AppHostStatus {
  readonly isExcel: boolean;
  readonly isOnline: boolean;
}

export interface AppAuthSummary {
  readonly isAuthenticated: boolean;
  readonly displayName: string | null;
  readonly roles: readonly string[];
}

@Injectable({ providedIn: "root" })
export class AppContextService {
  readonly hostStatus: AppHostStatus;

  constructor(
    private readonly excel: ExcelService,
    private readonly auth: AuthService
  ) {
    this.hostStatus = {
      isExcel: this.excel.isExcel,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    };
  }

  getAuthSummary(): AppAuthSummary {
    const user = this.auth.user;
    return {
      isAuthenticated: this.auth.isAuthenticated,
      displayName: user ? user.displayName : null,
      roles: this.auth.roles,
    };
  }
}
