import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { AppComponent } from "./app.component";
import { ExcelService } from "@excel-platform/core/excel";
import { AuthService } from "@excel-platform/core/auth";
import { AppContextService } from "@excel-platform/core/telemetry";
import { AppConfigService, NavItemConfig } from "@excel-platform/data/api";
import { IndexedDBService } from "@excel-platform/data/storage";

describe("AppComponent", () => {
  let component: AppComponent;
  let mockExcel: jasmine.SpyObj<ExcelService>;
  let mockAuth: jasmine.SpyObj<AuthService>;
  let mockAppContext: jasmine.SpyObj<AppContextService>;
  let mockAppConfig: jasmine.SpyObj<AppConfigService>;
  let mockIndexedDB: jasmine.SpyObj<IndexedDBService>;

  const mockConfig = {
    defaultViewId: "sso" as const,
    navItems: [],
    rootIdsAndClasses: { navClass: "nav", statusClass: "status", userBannerClass: "user-banner", hostStatusClass: "host-status", rootClass: "app" },
    roles: [],
    text: {
      nav: { ssoHome: "SSO Home" },
      auth: {},
      query: {},
      worksheet: {},
      table: {},
      user: {},
      hostStatus: {},
      userBanner: {},
      ui: {},
    },
  };

  beforeEach(async () => {
    mockExcel = jasmine.createSpyObj("ExcelService", [], { isExcel: false });

    mockAuth = jasmine.createSpyObj("AuthService", [
      "signInAsAnalyst",
      "signInAsAdmin",
      "signIn",
      "signOut",
      "hasAnyRole",
      "hasRole",
    ], {
      isAuthenticated: false,
      roles: [],
    });
    mockAuth.signInAsAnalyst.and.returnValue(Promise.resolve());
    mockAuth.signInAsAdmin.and.returnValue(Promise.resolve());
    mockAuth.signIn.and.returnValue(Promise.resolve());
    mockAuth.hasAnyRole.and.returnValue(false);

    mockAppContext = jasmine.createSpyObj("AppContextService", ["getAuthSummary"], {
      hostStatus: { isExcel: false, isOnline: true },
    });
    mockAppContext.getAuthSummary.and.returnValue({
      isAuthenticated: false,
      displayName: null,
      roles: [],
    });

    mockAppConfig = jasmine.createSpyObj("AppConfigService", ["getConfig"]);
    mockAppConfig.getConfig.and.returnValue(mockConfig);

    mockIndexedDB = jasmine.createSpyObj("IndexedDBService", ["clearExpiredCache"]);
    mockIndexedDB.clearExpiredCache.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: ExcelService, useValue: mockExcel },
        { provide: AuthService, useValue: mockAuth },
        { provide: AppContextService, useValue: mockAppContext },
        { provide: AppConfigService, useValue: mockAppConfig },
        { provide: IndexedDBService, useValue: mockIndexedDB },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should have title excel-extension", () => {
      expect(component.title).toEqual("excel-extension");
    });

    it("should set currentView from config", () => {
      expect(component.currentView).toBe("sso");
    });

    it("should set hostStatus from appContext", () => {
      expect(component.hostStatus).toEqual({ isExcel: false, isOnline: true });
    });
  });

  describe("ngOnInit", () => {
    it("should clear expired cache", async () => {
      await component.ngOnInit();
      expect(mockIndexedDB.clearExpiredCache).toHaveBeenCalled();
    });
  });

  describe("selectView", () => {
    it("should update currentView", () => {
      component.selectView("worksheets");
      expect(component.currentView).toBe("worksheets");
    });
  });

  describe("handleNavClick", () => {
    it("should select view for select-view action", () => {
      const item: NavItemConfig = {
        id: "test",
        labelKey: "nav.test",
        actionType: "select-view",
        viewId: "tables",
      };
      component.handleNavClick(item);
      expect(component.currentView).toBe("tables");
    });

    it("should call signOut for sign-out action", () => {
      const item: NavItemConfig = {
        id: "test",
        labelKey: "nav.test",
        actionType: "sign-out",
      };
      component.handleNavClick(item);
      expect(mockAuth.signOut).toHaveBeenCalled();
    });
  });

  describe("isNavVisible", () => {
    it("should hide sign-out when not authenticated", () => {
      Object.defineProperty(mockAuth, "isAuthenticated", { value: false });
      const item: NavItemConfig = {
        id: "signout",
        labelKey: "nav.signout",
        actionType: "sign-out",
      };
      expect(component.isNavVisible(item)).toBeFalse();
    });

    it("should hide auth-required nav when not authenticated", () => {
      Object.defineProperty(mockAuth, "isAuthenticated", { value: false });
      const item: NavItemConfig = {
        id: "test",
        labelKey: "nav.test",
        actionType: "select-view",
        requiresAuth: true,
      };
      expect(component.isNavVisible(item)).toBeFalse();
    });

    it("should hide role-restricted nav when user lacks role", () => {
      Object.defineProperty(mockAuth, "isAuthenticated", { value: true });
      mockAuth.hasAnyRole.and.returnValue(false);
      const item: NavItemConfig = {
        id: "test",
        labelKey: "nav.test",
        actionType: "select-view",
        requiredRoles: ["admin"],
      };
      expect(component.isNavVisible(item)).toBeFalse();
    });

    it("should show role-restricted nav when user has role", () => {
      Object.defineProperty(mockAuth, "isAuthenticated", { value: true });
      mockAuth.hasAnyRole.and.returnValue(true);
      const item: NavItemConfig = {
        id: "test",
        labelKey: "nav.test",
        actionType: "select-view",
        requiredRoles: ["analyst"],
      };
      expect(component.isNavVisible(item)).toBeTrue();
    });
  });

  describe("getNavLabel", () => {
    it("should return label from text catalog", () => {
      const label = component.getNavLabel("nav.ssoHome");
      expect(label).toBe("SSO Home");
    });

    it("should return labelKey if not found", () => {
      const label = component.getNavLabel("nav.unknown");
      expect(label).toBe("nav.unknown");
    });

    it("should return labelKey for invalid format", () => {
      const label = component.getNavLabel("invalid");
      expect(label).toBe("invalid");
    });
  });

  describe("auth methods", () => {
    it("should sign out and navigate to sso", () => {
      component.currentView = "queries";
      component.signOut();
      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(component.currentView).toBe("sso");
    });
  });

  describe("getters", () => {
    it("should return appConfig", () => {
      expect(component.appConfig).toEqual(mockConfig);
    });

    it("should return text from config", () => {
      expect(component.text.nav).toEqual({ ssoHome: "SSO Home" });
    });

    it("should return authSummary from appContext", () => {
      const summary = component.authSummary;
      expect(summary.isAuthenticated).toBeFalse();
    });
  });

  describe("canAccessNav", () => {
    it("should use same rules as isNavVisible", () => {
      const item: NavItemConfig = {
        id: "test",
        labelKey: "nav.test",
        actionType: "select-view",
      };
      expect(component.canAccessNav(item)).toBe(component.isNavVisible(item));
    });
  });
});
