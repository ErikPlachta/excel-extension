import { TestBed, ComponentFixture } from "@angular/core/testing";
import { TableComponent } from "./table.component";

describe("TableComponent", () => {
  let component: TableComponent<Record<string, unknown>>;
  let fixture: ComponentFixture<TableComponent<Record<string, unknown>>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TableComponent) as ComponentFixture<TableComponent<Record<string, unknown>>>;
    component = fixture.componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with empty columns array", () => {
      expect(component.columns).toEqual([]);
    });

    it("should initialize with empty rows array", () => {
      expect(component.rows).toEqual([]);
    });

    it("should initialize with empty message", () => {
      expect(component.emptyMessage).toBe("");
    });
  });

  describe("inputs", () => {
    it("should accept columns input", () => {
      const columns = [
        { field: "name", header: "Name" },
        { field: "age", header: "Age" },
      ];
      component.columns = columns;
      expect(component.columns).toEqual(columns);
    });

    it("should accept rows input", () => {
      const rows = [
        { name: "John", age: 30 },
        { name: "Jane", age: 25 },
      ];
      component.rows = rows;
      expect(component.rows).toEqual(rows);
    });

    it("should accept emptyMessage input", () => {
      component.emptyMessage = "No data available";
      expect(component.emptyMessage).toBe("No data available");
    });
  });

  describe("template rendering", () => {
    it("should render table when rows exist", () => {
      component.columns = [{ field: "name", header: "Name" }];
      component.rows = [{ name: "Test" }];
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector("table");
      expect(table).toBeTruthy();
    });

    it("should not render table when rows empty", () => {
      component.columns = [{ field: "name", header: "Name" }];
      component.rows = [];
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector("table");
      expect(table).toBeNull();
    });

    it("should render empty message when no rows", () => {
      component.emptyMessage = "No data";
      component.rows = [];
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector("p");
      expect(message?.textContent).toBe("No data");
    });

    it("should render column headers", () => {
      component.columns = [
        { field: "name", header: "Full Name" },
        { field: "email", header: "Email Address" },
      ];
      component.rows = [{ name: "Test", email: "test@test.com" }];
      fixture.detectChanges();

      const headers = fixture.nativeElement.querySelectorAll("th");
      expect(headers.length).toBe(2);
      expect(headers[0].textContent).toBe("Full Name");
      expect(headers[1].textContent).toBe("Email Address");
    });

    it("should render row data", () => {
      component.columns = [{ field: "name", header: "Name" }];
      component.rows = [{ name: "Alice" }, { name: "Bob" }];
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll("tbody tr");
      expect(rows.length).toBe(2);

      const cells = fixture.nativeElement.querySelectorAll("td");
      expect(cells[0].textContent).toBe("Alice");
      expect(cells[1].textContent).toBe("Bob");
    });

    it("should render multiple columns per row", () => {
      component.columns = [
        { field: "name", header: "Name" },
        { field: "value", header: "Value" },
      ];
      component.rows = [{ name: "Item", value: "123" }];
      fixture.detectChanges();

      const cells = fixture.nativeElement.querySelectorAll("td");
      expect(cells.length).toBe(2);
      expect(cells[0].textContent).toBe("Item");
      expect(cells[1].textContent).toBe("123");
    });
  });
});
