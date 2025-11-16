import { Routes } from "@angular/router";
import { HomeComponent } from "./home.component";
import { WorksheetsComponent } from "./worksheets.component";
import { TablesComponent } from "./tables.component";
import { SsoHomeComponent } from "./sso-home.component";

export const routes: Routes = [
  // Default route used only when not in Excel; in Excel we render SsoHomeComponent directly
  { path: "", component: SsoHomeComponent },
  { path: "home", component: HomeComponent },
  { path: "worksheets", component: WorksheetsComponent },
  { path: "tables", component: TablesComponent },
];
