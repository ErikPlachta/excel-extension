import { TestBed, ComponentFixture } from "@angular/core/testing";
import { ProgressIndicatorComponent } from "./progress-indicator.component";

describe("ProgressIndicatorComponent", () => {
  let component: ProgressIndicatorComponent;
  let fixture: ComponentFixture<ProgressIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressIndicatorComponent);
    component = fixture.componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with total 0", () => {
      expect(component.total).toBe(0);
    });

    it("should initialize with completed 0", () => {
      expect(component.completed).toBe(0);
    });

    it("should initialize with null currentItemId", () => {
      expect(component.currentItemId).toBeNull();
    });
  });

  describe("inputs", () => {
    it("should accept total input", () => {
      component.total = 100;
      expect(component.total).toBe(100);
    });

    it("should accept completed input", () => {
      component.completed = 50;
      expect(component.completed).toBe(50);
    });

    it("should accept currentItemId input", () => {
      component.currentItemId = "item-123";
      expect(component.currentItemId).toBe("item-123");
    });
  });

  describe("percent", () => {
    it("should return 0 when total is 0", () => {
      component.total = 0;
      component.completed = 0;
      expect(component.percent).toBe(0);
    });

    it("should calculate correct percentage", () => {
      component.total = 100;
      component.completed = 50;
      expect(component.percent).toBe(50);
    });

    it("should calculate correct percentage for partial values", () => {
      component.total = 10;
      component.completed = 3;
      expect(component.percent).toBe(30);
    });

    it("should cap percentage at 100", () => {
      component.total = 10;
      component.completed = 15;
      expect(component.percent).toBe(100);
    });

    it("should return 100 when fully completed", () => {
      component.total = 5;
      component.completed = 5;
      expect(component.percent).toBe(100);
    });
  });

  describe("template rendering", () => {
    it("should not render when total is 0", () => {
      component.total = 0;
      fixture.detectChanges();
      const indicator = fixture.nativeElement.querySelector(".app-progress-indicator");
      expect(indicator).toBeNull();
    });

    it("should render when total is greater than 0", () => {
      component.total = 10;
      fixture.detectChanges();
      const indicator = fixture.nativeElement.querySelector(".app-progress-indicator");
      expect(indicator).toBeTruthy();
    });

    it("should render completed / total label", () => {
      component.total = 10;
      component.completed = 3;
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector(".app-progress-indicator__label");
      expect(label.textContent).toContain("3 / 10");
    });

    it("should render currentItemId when provided", () => {
      component.total = 10;
      component.completed = 3;
      component.currentItemId = "test-item";
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector(".app-progress-indicator__label");
      expect(label.textContent).toContain("(current: test-item)");
    });

    it("should not render currentItemId when null", () => {
      component.total = 10;
      component.completed = 3;
      component.currentItemId = null;
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector(".app-progress-indicator__label");
      expect(label.textContent).not.toContain("current:");
    });

    it("should render progress bar", () => {
      component.total = 10;
      fixture.detectChanges();
      const bar = fixture.nativeElement.querySelector(".app-progress-indicator__bar");
      expect(bar).toBeTruthy();
    });

    it("should render progress bar fill", () => {
      component.total = 10;
      fixture.detectChanges();
      const fill = fixture.nativeElement.querySelector(".app-progress-indicator__bar-fill");
      expect(fill).toBeTruthy();
    });

    it("should set correct width on progress bar fill", () => {
      component.total = 100;
      component.completed = 75;
      fixture.detectChanges();
      const fill = fixture.nativeElement.querySelector(".app-progress-indicator__bar-fill");
      expect(fill.style.width).toBe("75%");
    });
  });
});
