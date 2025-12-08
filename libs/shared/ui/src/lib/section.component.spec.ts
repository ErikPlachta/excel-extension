import { TestBed, ComponentFixture } from "@angular/core/testing";
import { SectionComponent } from "./section.component";

describe("SectionComponent", () => {
  let component: SectionComponent;
  let fixture: ComponentFixture<SectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionComponent);
    component = fixture.componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with empty title", () => {
      expect(component.title).toBe("");
    });

    it("should initialize with empty subtitle", () => {
      expect(component.subtitle).toBe("");
    });

    it("should initialize with default variant", () => {
      expect(component.variant).toBe("default");
    });
  });

  describe("inputs", () => {
    it("should accept title input", () => {
      component.title = "Section Title";
      expect(component.title).toBe("Section Title");
    });

    it("should accept subtitle input", () => {
      component.subtitle = "Section Subtitle";
      expect(component.subtitle).toBe("Section Subtitle");
    });

    it("should accept variant input", () => {
      component.variant = "dense";
      expect(component.variant).toBe("dense");
    });
  });

  describe("sectionClass", () => {
    it("should return section class for default variant", () => {
      component.variant = "default";
      expect(component.sectionClass).toBe("section");
    });

    it("should return section section-dense class for dense variant", () => {
      component.variant = "dense";
      expect(component.sectionClass).toBe("section section-dense");
    });
  });

  describe("template rendering", () => {
    it("should render section element", () => {
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector("section");
      expect(section).toBeTruthy();
    });

    it("should apply section class", () => {
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector("section");
      expect(section.classList.contains("section")).toBe(true);
    });

    it("should apply section-dense class when variant is dense", () => {
      component.variant = "dense";
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector("section");
      expect(section.classList.contains("section-dense")).toBe(true);
    });

    it("should render header when title is provided", () => {
      component.title = "Test Title";
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector(".section-header");
      expect(header).toBeTruthy();
    });

    it("should not render header when title is empty", () => {
      component.title = "";
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector(".section-header");
      expect(header).toBeNull();
    });

    it("should render title in h2 element", () => {
      component.title = "My Section";
      fixture.detectChanges();
      const h2 = fixture.nativeElement.querySelector("h2");
      expect(h2.textContent).toBe("My Section");
    });

    it("should render subtitle when provided", () => {
      component.title = "Title";
      component.subtitle = "Subtitle text";
      fixture.detectChanges();
      const subtitle = fixture.nativeElement.querySelector(".section-subtitle");
      expect(subtitle.textContent).toBe("Subtitle text");
    });

    it("should not render subtitle when empty", () => {
      component.title = "Title";
      component.subtitle = "";
      fixture.detectChanges();
      const subtitle = fixture.nativeElement.querySelector(".section-subtitle");
      expect(subtitle).toBeNull();
    });

    it("should render section-body for content projection", () => {
      fixture.detectChanges();
      const body = fixture.nativeElement.querySelector(".section-body");
      expect(body).toBeTruthy();
    });
  });
});
