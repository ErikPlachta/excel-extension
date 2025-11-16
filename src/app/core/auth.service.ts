import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { getSsoAuthResult, SsoUserProfile } from "../../helpers/sso-helper";

export interface AuthState {
  isAuthenticated: boolean;
  user: SsoUserProfile | null;
  accessToken: string | null;
}

@Injectable({ providedIn: "root" })
export class AuthService {
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
