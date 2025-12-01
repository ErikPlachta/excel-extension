import { TestBed } from "@angular/core/testing";
import { UserComponent } from "./user.component";
import { AuthService } from "@excel-platform/core/auth";

describe("UserComponent", () => {
  let component: UserComponent;
  let mockAuth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    mockAuth = jasmine.createSpyObj("AuthService", ["hasRole"], {
      isAuthenticated: false,
      user: null,
      roles: [],
    });
    mockAuth.hasRole.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [UserComponent],
      providers: [{ provide: AuthService, useValue: mockAuth }],
    });

    component = TestBed.createComponent(UserComponent).componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should expose auth service", () => {
      expect(component.auth).toBe(mockAuth);
    });
  });

  describe("user getter", () => {
    it("should return null when not authenticated", () => {
      expect(component.user).toBeNull();
    });

    it("should return user when authenticated", () => {
      const mockUser = { id: "1", displayName: "Test User", email: "test@example.com", roles: ["analyst"] };
      Object.defineProperty(mockAuth, "user", { value: mockUser });
      expect(component.user).toEqual(mockUser);
    });
  });

  describe("roles getter", () => {
    it("should return empty array when not authenticated", () => {
      expect(component.roles).toEqual([]);
    });

    it("should return roles when authenticated", () => {
      Object.defineProperty(mockAuth, "roles", { value: ["analyst", "admin"] });
      expect(component.roles).toEqual(["analyst", "admin"]);
    });
  });

  describe("isAuthenticated getter", () => {
    it("should return false when not authenticated", () => {
      expect(component.isAuthenticated).toBeFalse();
    });

    it("should return true when authenticated", () => {
      Object.defineProperty(mockAuth, "isAuthenticated", { value: true });
      expect(component.isAuthenticated).toBeTrue();
    });
  });

  describe("isAdmin getter", () => {
    it("should return false when user is not admin", () => {
      mockAuth.hasRole.and.returnValue(false);
      expect(component.isAdmin).toBeFalse();
      expect(mockAuth.hasRole).toHaveBeenCalledWith("admin");
    });

    it("should return true when user is admin", () => {
      mockAuth.hasRole.and.callFake((role: string) => role === "admin");
      expect(component.isAdmin).toBeTrue();
    });
  });

  describe("isAnalyst getter", () => {
    it("should return false when user is not analyst", () => {
      mockAuth.hasRole.and.returnValue(false);
      expect(component.isAnalyst).toBeFalse();
      expect(mockAuth.hasRole).toHaveBeenCalledWith("analyst");
    });

    it("should return true when user is analyst", () => {
      mockAuth.hasRole.and.callFake((role: string) => role === "analyst");
      expect(component.isAnalyst).toBeTrue();
    });
  });
});
