#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const START_YEAR = 2024;
const END_YEAR = 2025;
const GROUPS = ["Consumer", "Enterprise", "Government"];
const SUB_GROUPS = ["North", "South", "East", "West"];

function* daysOfRange(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    yield new Date(d);
  }
}

function pick(arr, index) {
  return arr[index % arr.length];
}

function buildSalesSummaryRows(targetCount = 5000) {
  const rows = [];
  let i = 0;
  for (const day of daysOfRange(START_YEAR, END_YEAR)) {
    if (rows.length >= targetCount) break;
    // 3 rows per day -> ~ 1095 rows/year
    for (let j = 0; j < 3 && rows.length < targetCount; j += 1) {
      const group = pick(GROUPS, i + j);
      const subGroup = pick(SUB_GROUPS, i + j * 7);
      rows.push({
        AsOfDate: day.toISOString().slice(0, 10),
        Group: group,
        SubGroup: subGroup,
        Region: subGroup,
        Year: day.getFullYear(),
        Month: day.getMonth() + 1,
        Day: day.getDate(),
        Sales: 10000 + (day.getMonth() + 1) * 500 + day.getDate() * 20 + j * 100,
      });
    }
    i += 1;
  }
  return rows;
}

function buildTopCustomersRows(targetCount = 5000) {
  const rows = [];
  let rank = 1;
  for (const day of daysOfRange(START_YEAR, END_YEAR)) {
    if (rows.length >= targetCount) break;
    // ~10 customers per day until targetCount
    for (let j = 0; j < 10 && rows.length < targetCount; j += 1) {
      const group = pick(GROUPS, rank + j);
      const subGroup = pick(SUB_GROUPS, rank + j * 5);
      rows.push({
        Rank: rank,
        Customer: `Customer ${rank}`,
        Revenue: 50000 - rank * 20,
        AsOfDate: day.toISOString().slice(0, 10),
        Group: group,
        SubGroup: subGroup,
      });
      rank += 1;
      if (rank > targetCount) break;
    }
    if (rank > targetCount) break;
  }
  return rows;
}

function buildInventoryStatusRows(targetCount = 5000) {
  const products = ["Widget A", "Widget B", "Widget C", "Widget D", "Widget E", "Widget F"];
  const rows = [];
  let i = 0;
  for (const day of daysOfRange(START_YEAR, END_YEAR)) {
    if (rows.length >= targetCount) break;
    // ~3 products per day
    for (let j = 0; j < 3 && rows.length < targetCount; j += 1) {
      const product = pick(products, i + j);
      const group = pick(GROUPS, i + j * 3);
      const subGroup = pick(SUB_GROUPS, i + j * 11);
      rows.push({
        AsOfDate: day.toISOString().slice(0, 10),
        Group: group,
        SubGroup: subGroup,
        Product: product,
        SKU: `SKU-${1000 + ((i + j) % 9000)}`,
        OnHand: 100 - (day.getMonth() + 1) * 2 - day.getDate(),
        ReorderLevel: 40,
      });
    }
    i += 1;
  }
  return rows;
}

async function main() {
  const base = join(__dirname, "..", "src", "app", "shared", "mock-data");

  const sales = buildSalesSummaryRows();
  const topCustomers = buildTopCustomersRows();
  const inventory = buildInventoryStatusRows();

  await writeFile(join(base, "sales-summary.json"), JSON.stringify(sales, null, 2));
  await writeFile(join(base, "top-customers.json"), JSON.stringify(topCustomers, null, 2));
  await writeFile(join(base, "inventory-status.json"), JSON.stringify(inventory, null, 2));

  console.log(
    `Generated mock data: sales-summary=${sales.length}, top-customers=${topCustomers.length}, inventory-status=${inventory.length}`
  );
}

main().catch((err) => {
  console.error("Failed to generate mock data", err);
  process.exit(1);
});
