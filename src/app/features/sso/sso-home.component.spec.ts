import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SsoHomeComponent } from "./sso-home.component";
import { AuthService } from "../../core";

class AuthServiceStub {
  isAuthenticated = false;
  user: { displayName: string; email: string } | null = null;
  state = { accessToken: null as string | null };

  async signIn(): Promise<void> {
    this.isAuthenticated = true;
    this.user = { displayName: "Mock User", email: "mock.user@example.com" };
    this.state.accessToken = "mock-access-token-abc123";
  }

  signOut(): void {
    this.isAuthenticated = false;
    this.user = null;
    this.state.accessToken = null;
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

  it("signs in with mock data", async () => {
    await component.signIn();
    fixture.detectChanges();

    expect(component.isSignedIn).toBeTrue();
    expect(component.userName).toBe("Mock User");
    expect(component.userEmail).toBe("mock.user@example.com");
    expect(component.tokenSnippet).toBe("mock-acces…");
  });

  it("signs out and clears user state", async () => {
    await component.signIn();
    component.signOut();
    fixture.detectChanges();

    expect(component.isSignedIn).toBeFalse();
    expect(component.userName).toBeNull();
    expect(component.userEmail).toBeNull();
    expect(component.tokenSnippet).toBeNull();
  });
});
