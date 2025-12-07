import { TestBed, ComponentFixture } from "@angular/core/testing";
import { IconComponent } from "./icon.component";

describe("IconComponent", () => {
  let component: IconComponent;
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IconComponent);
    component = fixture.componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with play name", () => {
      expect(component.name).toBe("play");
    });
  });

  describe("inputs", () => {
    it("should accept name input", () => {
      component.name = "table";
      expect(component.name).toBe("table");
    });
  });

  describe("iconClass", () => {
    it("should return icon-play for play name", () => {
      component.name = "play";
      expect(component.iconClass).toBe("icon-play");
    });

    it("should return icon-table for table name", () => {
      component.name = "table";
      expect(component.iconClass).toBe("icon-table");
    });

    it("should return icon-user for user name", () => {
      component.name = "user";
      expect(component.iconClass).toBe("icon-user");
    });

    it("should return icon-warning for warning name", () => {
      component.name = "warning";
      expect(component.iconClass).toBe("icon-warning");
    });
  });

  describe("template rendering", () => {
    it("should render span element with icon class", () => {
      fixture.detectChanges();
      const span = fixture.nativeElement.querySelector("span.icon");
      expect(span).toBeTruthy();
    });

    it("should apply correct icon class based on name", () => {
      component.name = "table";
      fixture.detectChanges();
      const span = fixture.nativeElement.querySelector("span");
      expect(span.classList.contains("icon-table")).toBe(true);
    });

    it("should have aria-hidden attribute", () => {
      fixture.detectChanges();
      const span = fixture.nativeElement.querySelector("span");
      expect(span.getAttribute("aria-hidden")).toBe("true");
    });
  });
});
