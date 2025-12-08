import { TestBed, ComponentFixture } from "@angular/core/testing";
import { ListComponent, UiListItem } from "./list.component";

describe("ListComponent", () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with empty items array", () => {
      expect(component.items).toEqual([]);
    });

    it("should initialize with empty emptyMessage", () => {
      expect(component.emptyMessage).toBe("");
    });
  });

  describe("inputs", () => {
    it("should accept items input", () => {
      const items: UiListItem[] = [
        { id: "1", label: "Item 1" },
        { id: "2", label: "Item 2" },
      ];
      component.items = items;
      expect(component.items).toEqual(items);
    });

    it("should accept emptyMessage input", () => {
      component.emptyMessage = "No items found";
      expect(component.emptyMessage).toBe("No items found");
    });
  });

  describe("select", () => {
    it("should emit itemSelected event with clicked item", () => {
      const item: UiListItem = { id: "1", label: "Test Item" };
      spyOn(component.itemSelected, "emit");
      component.select(item);
      expect(component.itemSelected.emit).toHaveBeenCalledWith(item);
    });
  });

  describe("template rendering", () => {
    it("should render ul element when items exist", () => {
      component.items = [{ id: "1", label: "Item" }];
      fixture.detectChanges();
      const ul = fixture.nativeElement.querySelector("ul");
      expect(ul).toBeTruthy();
    });

    it("should render empty message when no items", () => {
      component.items = [];
      component.emptyMessage = "No items";
      fixture.detectChanges();
      const p = fixture.nativeElement.querySelector("p");
      expect(p.textContent).toBe("No items");
    });

    it("should render list items for each item", () => {
      component.items = [
        { id: "1", label: "Item 1" },
        { id: "2", label: "Item 2" },
        { id: "3", label: "Item 3" },
      ];
      fixture.detectChanges();
      const listItems = fixture.nativeElement.querySelectorAll("li");
      expect(listItems.length).toBe(3);
    });

    it("should render item label", () => {
      component.items = [{ id: "1", label: "Test Label" }];
      fixture.detectChanges();
      const strong = fixture.nativeElement.querySelector("strong");
      expect(strong.textContent).toBe("Test Label");
    });

    it("should render badge when provided", () => {
      component.items = [{ id: "1", label: "Item", badge: "New" }];
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector(".list-badge");
      expect(badge.textContent).toBe("New");
    });

    it("should not render badge when not provided", () => {
      component.items = [{ id: "1", label: "Item" }];
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector(".list-badge");
      expect(badge).toBeNull();
    });

    it("should render description when provided", () => {
      component.items = [{ id: "1", label: "Item", description: "Description text" }];
      fixture.detectChanges();
      const description = fixture.nativeElement.querySelector(".list-description");
      expect(description.textContent.trim()).toBe("Description text");
    });

    it("should not render description when not provided", () => {
      component.items = [{ id: "1", label: "Item" }];
      fixture.detectChanges();
      const description = fixture.nativeElement.querySelector(".list-description");
      expect(description).toBeNull();
    });

    it("should emit event when item is clicked", () => {
      const item: UiListItem = { id: "1", label: "Item" };
      component.items = [item];
      spyOn(component.itemSelected, "emit");
      fixture.detectChanges();

      const li = fixture.nativeElement.querySelector("li");
      li.click();

      expect(component.itemSelected.emit).toHaveBeenCalledWith(item);
    });
  });
});
