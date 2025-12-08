import { TestBed, ComponentFixture } from "@angular/core/testing";
import { DebugContextComponent } from "./debug-context.component";
import { AuthService } from "@excel-platform/core/auth";
import { WorkbookService } from "@excel-platform/core/excel";
import { QueryStateService } from "@excel-platform/data/query";
import { AppContextService } from "@excel-platform/core/telemetry";

describe("DebugContextComponent", () => {
  let component: DebugContextComponent;
  let fixture: ComponentFixture<DebugContextComponent>;
  let mockAuthService: Partial<AuthService>;
  let mockWorkbookService: Partial<WorkbookService>;
  let mockQueryStateService: Partial<QueryStateService>;
  let mockAppContextService: Partial<AppContextService>;

  beforeEach(async () => {
    mockAuthService = {
      isAuthenticated: false,
      user: null,
    };

    mockWorkbookService = {
      isExcel: false,
    };

    mockQueryStateService = {
      getApis: () => [],
    };

    mockAppContextService = {
      hostStatus: { platform: "test", initialized: true },
    };

    await TestBed.configureTestingModule({
      imports: [DebugContextComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: WorkbookService, useValue: mockWorkbookService },
        { provide: QueryStateService, useValue: mockQueryStateService },
        { provide: AppContextService, useValue: mockAppContextService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DebugContextComponent);
    component = fixture.componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should inject AppContextService", () => {
      expect(component.appContext).toBeDefined();
    });

    it("should inject AuthService", () => {
      expect(component.auth).toBeDefined();
    });

    it("should inject QueryStateService", () => {
      expect(component.queries).toBeDefined();
    });

    it("should inject WorkbookService", () => {
      expect(component.workbook).toBeDefined();
    });
  });

  describe("template rendering", () => {
    it("should render section element", () => {
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector("section");
      expect(section).toBeTruthy();
    });

    it("should render Debug / Context State heading", () => {
      fixture.detectChanges();
      const h2 = fixture.nativeElement.querySelector("h2");
      expect(h2.textContent).toContain("Debug / Context State");
    });

    it("should render Host heading", () => {
      fixture.detectChanges();
      const h3s = fixture.nativeElement.querySelectorAll("h3");
      expect(h3s[0].textContent).toContain("Host");
    });

    it("should render Auth heading", () => {
      fixture.detectChanges();
      const h3s = fixture.nativeElement.querySelectorAll("h3");
      expect(h3s[1].textContent).toContain("Auth");
    });

    it("should render APIs heading", () => {
      fixture.detectChanges();
      const h3s = fixture.nativeElement.querySelectorAll("h3");
      expect(h3s[2].textContent).toContain("APIs");
    });

    it("should render Workbook heading", () => {
      fixture.detectChanges();
      const h3s = fixture.nativeElement.querySelectorAll("h3");
      expect(h3s[3].textContent).toContain("Workbook");
    });

    it("should render pre elements for data display", () => {
      fixture.detectChanges();
      const pres = fixture.nativeElement.querySelectorAll("pre");
      expect(pres.length).toBe(4);
    });
  });

  describe("service data display", () => {
    it("should display isExcel value", () => {
      fixture.detectChanges();
      const pres = fixture.nativeElement.querySelectorAll("pre");
      expect(pres[3].textContent).toContain("false");
    });

    it("should display APIs as JSON array", () => {
      fixture.detectChanges();
      const pres = fixture.nativeElement.querySelectorAll("pre");
      expect(pres[2].textContent).toContain("[]");
    });
  });
});
