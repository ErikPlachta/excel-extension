import { TestBed } from "@angular/core/testing";
import { HomeComponent } from "./home.component";
import { ExcelService } from "@excel-platform/core/excel";

describe("HomeComponent", () => {
  let component: HomeComponent;
  let mockExcel: jasmine.SpyObj<ExcelService>;

  beforeEach(() => {
    mockExcel = jasmine.createSpyObj("ExcelService", [], {
      isExcel: false,
    });

    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [{ provide: ExcelService, useValue: mockExcel }],
    });

    component = TestBed.createComponent(HomeComponent).componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should expose ExcelService", () => {
      expect(component.excel).toBe(mockExcel);
    });
  });

  describe("isExcel property", () => {
    it("should return false when not in Excel", () => {
      expect(component.excel.isExcel).toBeFalse();
    });

    it("should return true when in Excel", () => {
      Object.defineProperty(mockExcel, "isExcel", { value: true });
      expect(component.excel.isExcel).toBeTrue();
    });
  });
});
