import { TestBed, ComponentFixture } from "@angular/core/testing";
import { ButtonComponent } from "./button.component";

describe("ButtonComponent", () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with empty label", () => {
      expect(component.label).toBe("");
    });

    it("should initialize with primary variant", () => {
      expect(component.variant).toBe("primary");
    });

    it("should initialize with md size", () => {
      expect(component.size).toBe("md");
    });

    it("should initialize with disabled false", () => {
      expect(component.disabled).toBe(false);
    });

    it("should initialize with null iconName", () => {
      expect(component.iconName).toBeNull();
    });
  });

  describe("inputs", () => {
    it("should accept label input", () => {
      component.label = "Click me";
      expect(component.label).toBe("Click me");
    });

    it("should accept variant input", () => {
      component.variant = "secondary";
      expect(component.variant).toBe("secondary");
    });

    it("should accept size input", () => {
      component.size = "lg";
      expect(component.size).toBe("lg");
    });

    it("should accept disabled input", () => {
      component.disabled = true;
      expect(component.disabled).toBe(true);
    });

    it("should accept iconName input", () => {
      component.iconName = "play";
      expect(component.iconName).toBe("play");
    });
  });

  describe("buttonClass", () => {
    it("should return primary class by default", () => {
      expect(component.buttonClass).toBe("btn btn-primary btn-md");
    });

    it("should return secondary class for secondary variant", () => {
      component.variant = "secondary";
      expect(component.buttonClass).toBe("btn btn-secondary btn-md");
    });

    it("should return ghost class for ghost variant", () => {
      component.variant = "ghost";
      expect(component.buttonClass).toBe("btn btn-ghost btn-md");
    });

    it("should return sm class for small size", () => {
      component.size = "sm";
      expect(component.buttonClass).toBe("btn btn-primary btn-sm");
    });

    it("should return lg class for large size", () => {
      component.size = "lg";
      expect(component.buttonClass).toBe("btn btn-primary btn-lg");
    });
  });

  describe("handleClick", () => {
    it("should emit clicked event when not disabled", () => {
      spyOn(component.clicked, "emit");
      component.handleClick();
      expect(component.clicked.emit).toHaveBeenCalled();
    });

    it("should not emit clicked event when disabled", () => {
      spyOn(component.clicked, "emit");
      component.disabled = true;
      component.handleClick();
      expect(component.clicked.emit).not.toHaveBeenCalled();
    });
  });

  describe("template rendering", () => {
    it("should render button element", () => {
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector("button");
      expect(button).toBeTruthy();
    });

    it("should render label text", () => {
      component.label = "Submit";
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector("button");
      expect(button.textContent).toContain("Submit");
    });

    it("should apply disabled attribute when disabled", () => {
      component.disabled = true;
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector("button");
      expect(button.disabled).toBe(true);
    });

    it("should render icon span when iconName is set", () => {
      component.iconName = "play";
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector(".btn-icon");
      expect(icon).toBeTruthy();
    });

    it("should not render icon span when iconName is null", () => {
      component.iconName = null;
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector(".btn-icon");
      expect(icon).toBeNull();
    });
  });
});
