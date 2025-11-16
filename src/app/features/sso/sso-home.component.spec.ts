import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SsoHomeComponent } from "./sso-home.component";
import { getMockSsoResult as realGetMockSsoResult } from "../helpers/sso-mock";

describe("SsoHomeComponent", () => {
  let fixture: ComponentFixture<SsoHomeComponent>;
  let component: SsoHomeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SsoHomeComponent],
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
