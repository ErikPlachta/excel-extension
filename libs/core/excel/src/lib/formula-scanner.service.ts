import { Injectable } from "@angular/core";
import {
  ExcelOperationResult,
  FormulaDependency,
  FormulaScanResult,
  QueryImpactAssessment,
  TableColumnReference,
} from "@excel-platform/shared/types";
import { ExcelService } from "./excel.service";
import { TelemetryService } from "@excel-platform/core/telemetry";

// Office.js globals provided at runtime by Excel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Excel: any;

/**
 * Scans workbook formulas for table/column dependencies.
 *
 * Detects Excel structured references (e.g., Table1[Column], Table1[\@Column])
 * in formulas across all worksheets. Used to warn users before query updates
 * that would affect formula-dependent columns.
 *
 * **Key Features:**
 * - Workbook-wide formula scanning with caching (5-min TTL)
 * - Structured reference parsing (handles \@, #, spaces in column names)
 * - Query impact assessment before execution
 * - CSV report generation for formula dependencies
 *
 * **Usage:**
 * ```typescript
 * // Scan workbook for formula dependencies
 * const scan = await formulaScanner.scanWorkbook();
 * if (scan.ok) {
 *   console.log(`Found ${scan.value.dependencies.length} dependencies`);
 * }
 *
 * // Check impact before running query
 * const impact = await formulaScanner.checkQueryImpact('sales-query', 'SalesTable');
 * if (impact.ok && impact.value.hasImpact) {
 *   // Show warning to user
 * }
 * ```
 */
@Injectable({ providedIn: "root" })
export class FormulaScannerService {
  /** Cached scan result with TTL */
  private cachedScan: { result: FormulaScanResult; timestamp: number } | null = null;

  /** Cache TTL in milliseconds (5 minutes) */
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  /**
   * Regex for parsing Excel structured references.
   *
   * Handles:
   * - Table1[Column] - basic column reference
   * - Table1[[Column]] - column with specifiers
   * - Table1[\@Column] - this row reference
   * - Table1[#Headers] - special items (#Headers, #All, #Data, #Totals)
   * - Column names with spaces: Table1[Sales Amount]
   */
  private readonly STRUCTURED_REF_REGEX =
    /([A-Za-z_][A-Za-z0-9_]*)\[(@?\[?#?[A-Za-z_][A-Za-z0-9_ ]*\]?)\]/g;

  constructor(
    private readonly excel: ExcelService,
    private readonly telemetry: TelemetryService
  ) {}

  /**
   * Scans the entire workbook for formulas that reference table columns.
   *
   * Results are cached for 5 minutes to avoid expensive re-scans on every
   * query execution. Use `forceRefresh` to bypass cache.
   *
   * @param forceRefresh - If true, bypasses cache and performs fresh scan
   * @returns ExcelOperationResult with scan results
   */
  async scanWorkbook(forceRefresh = false): Promise<ExcelOperationResult<FormulaScanResult>> {
    if (!this.excel.isExcel) {
      return {
        ok: false,
        error: {
          operation: "scanWorkbook",
          message: "Excel is not available in the current host.",
        },
      };
    }

    // Check cache
    if (!forceRefresh && this.cachedScan) {
      const age = Date.now() - this.cachedScan.timestamp;
      if (age < this.CACHE_TTL_MS) {
        this.telemetry.logEvent({
          category: "formula",
          name: "scanWorkbook:cache-hit",
          severity: "debug",
          context: { cacheAgeMs: age },
        });
        return { ok: true, value: this.cachedScan.result };
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await Excel!.run(async (ctx: any) => {
        const dependencies: FormulaDependency[] = [];
        let sheetsScanned = 0;
        let formulasAnalyzed = 0;

        const worksheets = ctx.workbook.worksheets;
        worksheets.load("items/name");
        await ctx.sync();

        for (const sheet of worksheets.items) {
          // Skip hidden/system sheets
          if (sheet.name.startsWith("_Extension")) continue;

          sheetsScanned++;
          const usedRange = sheet.getUsedRangeOrNullObject();
          await ctx.sync();

          if (usedRange.isNullObject) continue;

          usedRange.load("formulas,address,rowCount,columnCount");
          await ctx.sync();

          const formulas = usedRange.formulas as unknown[][];
          if (!formulas || formulas.length === 0) continue;

          // Parse formulas cell by cell
          const startAddress = usedRange.address.split("!")[1] || "A1";
          const startCol = this.columnLetterToIndex(startAddress.replace(/[0-9]/g, ""));
          const startRow = parseInt(startAddress.replace(/[A-Za-z]/g, ""), 10);

          for (let row = 0; row < formulas.length; row++) {
            for (let col = 0; col < formulas[row].length; col++) {
              const cellFormula = formulas[row][col];
              if (typeof cellFormula !== "string" || !cellFormula.startsWith("=")) continue;

              formulasAnalyzed++;
              const refs = this.parseTableColumnReferences(cellFormula);

              for (const ref of refs) {
                dependencies.push({
                  sheetName: sheet.name,
                  cellAddress: this.indexToAddress(startCol + col, startRow + row),
                  formula: cellFormula,
                  tableName: ref.tableName,
                  columnName: ref.columnName,
                });
              }
            }
          }
        }

        const scanResult: FormulaScanResult = {
          dependencies,
          sheetsScanned,
          formulasAnalyzed,
          scannedAt: new Date(),
        };

        return scanResult;
      });

      // Update cache
      this.cachedScan = { result, timestamp: Date.now() };

      this.telemetry.logEvent({
        category: "formula",
        name: "scanWorkbook",
        severity: "info",
        context: {
          dependencyCount: result.dependencies.length,
          sheetsScanned: result.sheetsScanned,
          formulasAnalyzed: result.formulasAnalyzed,
        },
      });

      return { ok: true, value: result };
    } catch (err) {
      return this.telemetry.normalizeError<FormulaScanResult>(
        "scanWorkbook",
        err,
        "Failed to scan workbook for formula dependencies."
      );
    }
  }

  /**
   * Parses Excel structured references from a formula string.
   *
   * @param formula - Excel formula string (e.g., "=SUM(Sales[Amount])")
   * @returns Array of table/column references found in the formula
   */
  parseTableColumnReferences(formula: string): TableColumnReference[] {
    const references: TableColumnReference[] = [];
    const regex = new RegExp(this.STRUCTURED_REF_REGEX.source, "g");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(formula)) !== null) {
      const tableName = match[1];
      let columnPart = match[2];

      // Skip special items like #Headers, #All, #Data, #Totals
      if (columnPart.startsWith("#")) continue;

      // Clean up column name: remove @, extra brackets
      columnPart = columnPart.replace(/^@/, "").replace(/^\[/, "").replace(/\]$/, "");

      references.push({
        tableName,
        columnName: columnPart || undefined,
      });
    }

    return references;
  }

  /**
   * Assesses the impact of a query update on formula-dependent columns.
   *
   * Scans workbook (using cache if available) and checks if any formulas
   * reference the target table's columns.
   *
   * @param queryId - Query ID for tracking
   * @param tableName - Target table name to check
   * @param columns - Optional specific columns to check; if omitted, checks all
   * @returns ExcelOperationResult with impact assessment
   */
  async checkQueryImpact(
    queryId: string,
    tableName: string,
    columns?: string[]
  ): Promise<ExcelOperationResult<QueryImpactAssessment>> {
    const scanResult = await this.scanWorkbook();

    if (!scanResult.ok || !scanResult.value) {
      return {
        ok: false,
        error: scanResult.error ?? { operation: "checkQueryImpact", message: "Scan failed" },
      };
    }

    const dependencies = scanResult.value.dependencies;

    // Filter dependencies for this table
    const tableDeps = dependencies.filter(
      (d) => d.tableName.toLowerCase() === tableName.toLowerCase()
    );

    // Further filter by columns if specified
    const affectedDeps = columns
      ? tableDeps.filter(
          (d) => d.columnName && columns.map((c) => c.toLowerCase()).includes(d.columnName.toLowerCase())
        )
      : tableDeps;

    // Get unique affected columns
    const affectedColumns = [...new Set(affectedDeps.map((d) => d.columnName).filter(Boolean))] as string[];

    // Determine severity
    let severity: "none" | "low" | "high" = "none";
    if (affectedDeps.length > 0) {
      severity = affectedDeps.length <= 5 ? "low" : "high";
    }

    const assessment: QueryImpactAssessment = {
      queryId,
      tableName,
      hasImpact: affectedDeps.length > 0,
      affectedColumns,
      affectedFormulas: affectedDeps,
      severity,
    };

    this.telemetry.logEvent({
      category: "formula",
      name: "checkQueryImpact",
      severity: "info",
      context: {
        queryId,
        tableName,
        hasImpact: assessment.hasImpact,
        affectedFormulaCount: affectedDeps.length,
        severity,
      },
    });

    return { ok: true, value: assessment };
  }

  /**
   * Gets all formula dependencies grouped by table name.
   *
   * @returns ExcelOperationResult with Map\<tableName, FormulaDependency[]\>
   */
  async getTableDependencies(): Promise<ExcelOperationResult<Map<string, FormulaDependency[]>>> {
    const scanResult = await this.scanWorkbook();

    if (!scanResult.ok || !scanResult.value) {
      return {
        ok: false,
        error: scanResult.error ?? { operation: "getTableDependencies", message: "Scan failed" },
      };
    }

    const grouped = new Map<string, FormulaDependency[]>();

    for (const dep of scanResult.value.dependencies) {
      const existing = grouped.get(dep.tableName) ?? [];
      existing.push(dep);
      grouped.set(dep.tableName, existing);
    }

    return { ok: true, value: grouped };
  }

  /**
   * Generates a CSV report of formula dependencies.
   *
   * @param dependencies - Array of formula dependencies to export
   * @returns CSV string with headers: Sheet,Cell,Formula,Table,Column
   */
  generateReportCsv(dependencies: FormulaDependency[]): string {
    const header = "Sheet,Cell,Formula,Table,Column\n";
    const rows = dependencies
      .map(
        (d) =>
          `"${this.escapeCsvField(d.sheetName)}","${d.cellAddress}","${this.escapeCsvField(d.formula)}","${this.escapeCsvField(d.tableName)}","${d.columnName ?? ""}"`
      )
      .join("\n");
    return header + rows;
  }

  /**
   * Clears the cached scan result.
   * Call this when workbook structure changes significantly.
   */
  clearCache(): void {
    this.cachedScan = null;
    this.telemetry.logEvent({
      category: "formula",
      name: "clearCache",
      severity: "debug",
    });
  }

  /**
   * Escapes a field for CSV output (doubles quotes).
   */
  private escapeCsvField(value: string): string {
    return value.replace(/"/g, '""');
  }

  /**
   * Converts column letter(s) to zero-based index.
   * E.g., 'A' -\> 0, 'B' -\> 1, 'AA' -\> 26
   */
  private columnLetterToIndex(letters: string): number {
    let result = 0;
    for (let i = 0; i < letters.length; i++) {
      result = result * 26 + letters.charCodeAt(i) - 64;
    }
    return result - 1;
  }

  /**
   * Converts zero-based column index + row number to Excel address.
   * E.g., (0, 1) -\> 'A1', (26, 5) -\> 'AA5'
   */
  private indexToAddress(col: number, row: number): string {
    let letters = "";
    let c = col;
    while (c >= 0) {
      letters = String.fromCharCode((c % 26) + 65) + letters;
      c = Math.floor(c / 26) - 1;
    }
    return `${letters}${row}`;
  }
}
