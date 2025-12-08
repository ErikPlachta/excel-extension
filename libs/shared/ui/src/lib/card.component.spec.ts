import { TestBed, ComponentFixture } from "@angular/core/testing";
import { CardComponent } from "./card.component";

describe("CardComponent", () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
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
      component.title = "Card Title";
      expect(component.title).toBe("Card Title");
    });

    it("should accept subtitle input", () => {
      component.subtitle = "Card Subtitle";
      expect(component.subtitle).toBe("Card Subtitle");
    });

    it("should accept variant input", () => {
      component.variant = "emphasis";
      expect(component.variant).toBe("emphasis");
    });
  });

  describe("template rendering", () => {
    it("should render article element with card class", () => {
      fixture.detectChanges();
      const article = fixture.nativeElement.querySelector("article.card");
      expect(article).toBeTruthy();
    });

    it("should render header when title is provided", () => {
      component.title = "Test Title";
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector(".card-header");
      expect(header).toBeTruthy();
    });

    it("should not render header when title is empty", () => {
      component.title = "";
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector(".card-header");
      expect(header).toBeNull();
    });

    it("should render title in h3 element", () => {
      component.title = "My Title";
      fixture.detectChanges();
      const h3 = fixture.nativeElement.querySelector("h3");
      expect(h3.textContent).toBe("My Title");
    });

    it("should render subtitle when provided", () => {
      component.title = "Title";
      component.subtitle = "Subtitle";
      fixture.detectChanges();
      const subtitle = fixture.nativeElement.querySelector(".card-subtitle");
      expect(subtitle.textContent).toBe("Subtitle");
    });

    it("should not render subtitle when empty", () => {
      component.title = "Title";
      component.subtitle = "";
      fixture.detectChanges();
      const subtitle = fixture.nativeElement.querySelector(".card-subtitle");
      expect(subtitle).toBeNull();
    });

    it("should apply card-emphasis class when variant is emphasis", () => {
      component.variant = "emphasis";
      fixture.detectChanges();
      const article = fixture.nativeElement.querySelector("article");
      expect(article.classList.contains("card-emphasis")).toBe(true);
    });

    it("should not apply card-emphasis class when variant is default", () => {
      component.variant = "default";
      fixture.detectChanges();
      const article = fixture.nativeElement.querySelector("article");
      expect(article.classList.contains("card-emphasis")).toBe(false);
    });

    it("should render card-body for content projection", () => {
      fixture.detectChanges();
      const body = fixture.nativeElement.querySelector(".card-body");
      expect(body).toBeTruthy();
    });
  });
});
