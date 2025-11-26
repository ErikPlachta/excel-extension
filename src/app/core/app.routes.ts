import { Routes } from "@angular/router";
import { HomeComponent } from "../features/home/home.component";
import { WorksheetsComponent } from "../features/worksheets/worksheets.component";
import { TablesComponent } from "../features/tables/tables.component";
import { SsoHomeComponent } from "../features/sso/sso-home.component";

export const routes: Routes = [
  // Default route used only when not in Excel; in Excel we render SsoHomeComponent directly
  { path: "", component: SsoHomeComponent },
  { path: "home", component: HomeComponent },
  { path: "worksheets", component: WorksheetsComponent },
  { path: "tables", component: TablesComponent },
];
