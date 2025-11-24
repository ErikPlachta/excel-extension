import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { AppComponent } from "./app.component";
import { AppContextService } from "./app-context.service";

describe("AppComponent", () => {
  beforeEach(async () => {
    const appContextStub = {
      get hostStatus() {
        return { isExcel: false, isOnline: true };
      },
      getAuthSummary() {
        return { isAuthenticated: false, displayName: "", roles: [] };
      },
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: AppContextService, useValue: appContextStub }],
    }).compileComponents();
  });

  it("should create the app", () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'excel-extension' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual("excel-extension");
  });

  it("should render nav status element", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const nav = compiled.querySelector("nav");
    expect(nav).toBeTruthy();
  });
});
