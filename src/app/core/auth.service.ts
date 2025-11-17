import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { getSsoAuthResult, SsoUserProfile } from "../../helpers/sso-helper";
import { AuthState } from "../types";

@Injectable({ providedIn: "root" })
export class AuthService {
  private static readonly STORAGE_KEY = "excel-extension-auth-state";

  private readonly stateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
  });

  readonly state$ = this.stateSubject.asObservable();

  get state(): AuthState {
    return this.stateSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  get user(): SsoUserProfile | null {
    return this.state.user;
  }

  get roles(): string[] {
    return this.state.user?.roles ?? [];
  }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((r) => this.roles.includes(r));
  }

  constructor() {
    const raw =
      typeof window !== "undefined" ? window.localStorage.getItem(AuthService.STORAGE_KEY) : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthState;
        this.stateSubject.next(parsed);
      } catch {
        // Ignore malformed stored state
      }
    }

    this.state$.subscribe((state) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Ignore storage errors
      }
    });
  }

  async signInAsAnalyst(): Promise<void> {
    const result = await getSsoAuthResult();
    const user: SsoUserProfile = {
      ...result.user,
      roles: ["analyst"],
    };

    this.stateSubject.next({
      isAuthenticated: true,
      user,
      accessToken: result.accessToken,
    });
  }

  async signInAsAdmin(): Promise<void> {
    const result = await getSsoAuthResult();
    const user: SsoUserProfile = {
      ...result.user,
      roles: ["admin"],
    };

    this.stateSubject.next({
      isAuthenticated: true,
      user,
      accessToken: result.accessToken,
    });
  }

  async signIn(): Promise<void> {
    const result = await getSsoAuthResult();
    this.stateSubject.next({
      isAuthenticated: true,
      user: result.user,
      accessToken: result.accessToken,
    });
  }

  signOut(): void {
    this.stateSubject.next({
      isAuthenticated: false,
      user: null,
      accessToken: null,
    });
  }
}
