import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SsoHomeComponent } from "./sso-home.component";
import { AuthService } from "@excel-platform/core/auth";

class AuthServiceStub {
  isAuthenticated = false;
  user: { displayName: string; email: string; roles?: string[] } | null = null;
  roles: string[] = [];
  state = { accessToken: null as string | null };

  async signIn(): Promise<void> {
    this.isAuthenticated = true;
    this.user = { displayName: "Mock User", email: "mock.user@example.com" };
    this.roles = ["analyst"];
    this.state.accessToken = "mock-access-token-abc123";
  }

  async signInWithJwt(
    email: string,
    _password: string,
    roles: string[] = ["analyst"]
  ): Promise<void> {
    this.isAuthenticated = true;
    this.user = { displayName: email.split("@")[0], email, roles };
    this.roles = roles;
    this.state.accessToken = "mock-jwt-token-xyz789";
  }

  signOut(): void {
    this.isAuthenticated = false;
    this.user = null;
    this.roles = [];
    this.state.accessToken = null;
  }

  getAccessToken(): string | null {
    return this.state.accessToken;
  }

  isAccessTokenExpiringSoon(): boolean {
    return false;
  }
}

describe("SsoHomeComponent", () => {
  let fixture: ComponentFixture<SsoHomeComponent>;
  let component: SsoHomeComponent;

  beforeEach(async () => {
    const authStub = new AuthServiceStub();
    await TestBed.configureTestingModule({
      imports: [SsoHomeComponent],
      providers: [{ provide: AuthService, useValue: authStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(SsoHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("starts signed out", () => {
    expect(component.isSignedIn).toBeFalse();
    expect(component.userName).toBeNull();
  });

  it("signs in with signInAs and AuthUserConfig", async () => {
    const user = { id: 'test', label: 'Test', email: 'test@example.com', role: 'analyst' as const };
    await component.signInAs(user);
    fixture.detectChanges();

    expect(component.isSignedIn).toBeTrue();
    expect(component.userEmail).toBe("test@example.com");
  });

  it("signs out and clears user state", async () => {
    const user = { id: 'test', label: 'Test', email: 'test@example.com', role: 'analyst' as const };
    await component.signInAs(user);
    component.signOut();
    fixture.detectChanges();

    expect(component.isSignedIn).toBeFalse();
    expect(component.userName).toBeNull();
    expect(component.userEmail).toBeNull();
    expect(component.tokenSnippet).toBeNull();
  });

  describe("JWT Authentication", () => {
    it("signs in with JWT using email and role", async () => {
      component.email = "test@example.com";
      component.password = "password123";
      component.selectedRole = "admin";

      await component.signInWithJwt();
      fixture.detectChanges();

      expect(component.isSignedIn).toBeTrue();
      expect(component.userEmail).toBe("test@example.com");
    });

    it("shows error when email is missing", async () => {
      component.email = "";
      component.password = "password123";

      await component.signInWithJwt();

      expect(component.signInError).toBe("Email is required");
      expect(component.isSignedIn).toBeFalse();
    });

    it("clears form after successful JWT sign-in", async () => {
      component.email = "test@example.com";
      component.password = "password123";

      await component.signInWithJwt();

      expect(component.email).toBe("");
      expect(component.password).toBe("");
    });

    it("returns false for isTokenExpiringSoon when not expiring", () => {
      expect(component.isTokenExpiringSoon).toBeFalse();
    });

    it("returns null for tokenExpiryDisplay when no token", () => {
      expect(component.tokenExpiryDisplay).toBeNull();
    });

    it("returns null for tokenExpiryDisplay with non-JWT token", async () => {
      // Use signInAs instead of deprecated signIn
      const user = { id: 'test', label: 'Test', email: 'test@example.com', role: 'analyst' as const };
      await component.signInAs(user);
      expect(component.tokenExpiryDisplay).toBeNull();
    });
  });
});
