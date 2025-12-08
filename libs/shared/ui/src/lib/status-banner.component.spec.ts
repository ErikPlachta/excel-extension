import { TestBed, ComponentFixture } from "@angular/core/testing";
import { StatusBannerComponent } from "./status-banner.component";

describe("StatusBannerComponent", () => {
  let component: StatusBannerComponent;
  let fixture: ComponentFixture<StatusBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBannerComponent);
    component = fixture.componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with info type", () => {
      expect(component.type).toBe("info");
    });

    it("should initialize with empty title", () => {
      expect(component.title).toBe("");
    });

    it("should initialize with empty message", () => {
      expect(component.message).toBe("");
    });
  });

  describe("inputs", () => {
    it("should accept type input", () => {
      component.type = "warning";
      expect(component.type).toBe("warning");
    });

    it("should accept title input", () => {
      component.title = "Banner Title";
      expect(component.title).toBe("Banner Title");
    });

    it("should accept message input", () => {
      component.message = "Banner message text";
      expect(component.message).toBe("Banner message text");
    });
  });

  describe("bannerClass", () => {
    it("should return banner banner-info for info type", () => {
      component.type = "info";
      expect(component.bannerClass).toBe("banner banner-info");
    });

    it("should return banner banner-warning for warning type", () => {
      component.type = "warning";
      expect(component.bannerClass).toBe("banner banner-warning");
    });

    it("should return banner banner-error for error type", () => {
      component.type = "error";
      expect(component.bannerClass).toBe("banner banner-error");
    });
  });

  describe("template rendering", () => {
    it("should not render when message is empty", () => {
      component.message = "";
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector("section");
      expect(section).toBeNull();
    });

    it("should render when message is provided", () => {
      component.message = "Test message";
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector("section");
      expect(section).toBeTruthy();
    });

    it("should apply correct banner class based on type", () => {
      component.message = "Test";
      component.type = "warning";
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector("section");
      expect(section.classList.contains("banner")).toBe(true);
      expect(section.classList.contains("banner-warning")).toBe(true);
    });

    it("should render title when provided", () => {
      component.message = "Test message";
      component.title = "Alert";
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector(".banner-title");
      expect(title.textContent).toBe("Alert");
    });

    it("should not render title when empty", () => {
      component.message = "Test message";
      component.title = "";
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector(".banner-title");
      expect(title).toBeNull();
    });

    it("should render message text", () => {
      component.message = "Important information";
      fixture.detectChanges();
      const message = fixture.nativeElement.querySelector(".banner-message");
      expect(message.textContent).toBe("Important information");
    });
  });
});
