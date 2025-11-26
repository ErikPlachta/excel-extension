import { TestBed, ComponentFixture } from "@angular/core/testing";
import { DropdownComponent, UiDropdownItem } from "./dropdown.component";
import { FormsModule } from "@angular/forms";

describe("DropdownComponent", () => {
  let component: DropdownComponent;
  let fixture: ComponentFixture<DropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DropdownComponent);
    component = fixture.componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with empty items array", () => {
      expect(component.items).toEqual([]);
    });

    it("should initialize with null value", () => {
      expect(component.value).toBeNull();
    });

    it("should initialize with empty placeholder", () => {
      expect(component.placeholder).toBe("");
    });

    it("should initialize with empty label", () => {
      expect(component.label).toBe("");
    });
  });

  describe("inputs", () => {
    it("should accept items input", () => {
      const items: UiDropdownItem[] = [
        { value: "1", label: "Option 1" },
        { value: "2", label: "Option 2" },
      ];
      component.items = items;
      expect(component.items).toEqual(items);
    });

    it("should accept value input", () => {
      component.value = "test-value";
      expect(component.value).toBe("test-value");
    });

    it("should accept placeholder input", () => {
      component.placeholder = "Select an option";
      expect(component.placeholder).toBe("Select an option");
    });

    it("should accept label input", () => {
      component.label = "My Dropdown";
      expect(component.label).toBe("My Dropdown");
    });
  });

  describe("onChange", () => {
    it("should update value", () => {
      component.onChange("new-value");
      expect(component.value).toBe("new-value");
    });

    it("should emit valueChange event", () => {
      spyOn(component.valueChange, "emit");
      component.onChange("new-value");
      expect(component.valueChange.emit).toHaveBeenCalledWith("new-value");
    });

    it("should handle empty string value", () => {
      component.value = "some-value";
      component.onChange("");
      expect(component.value).toBe("");
    });
  });

  describe("template rendering", () => {
    it("should render select element", () => {
      fixture.detectChanges();
      const select = fixture.nativeElement.querySelector("select");
      expect(select).toBeTruthy();
    });

    it("should render options for items", () => {
      component.items = [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ];
      fixture.detectChanges();
      const options = fixture.nativeElement.querySelectorAll("option:not([disabled])");
      expect(options.length).toBe(2);
    });

    it("should render label when provided", () => {
      component.label = "Test Label";
      fixture.detectChanges();
      const labelSpan = fixture.nativeElement.querySelector(".dropdown-label");
      expect(labelSpan?.textContent).toBe("Test Label");
    });

    it("should not render label when not provided", () => {
      component.label = "";
      fixture.detectChanges();
      const labelSpan = fixture.nativeElement.querySelector(".dropdown-label");
      expect(labelSpan).toBeNull();
    });

    it("should render placeholder option when provided", () => {
      component.placeholder = "Choose one";
      fixture.detectChanges();
      const placeholder = fixture.nativeElement.querySelector("option[disabled]");
      expect(placeholder?.textContent).toContain("Choose one");
    });
  });
});
