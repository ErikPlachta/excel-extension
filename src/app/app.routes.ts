import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { WorksheetsComponent } from './worksheets.component';
import { TablesComponent } from './tables.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'worksheets', component: WorksheetsComponent },
  { path: 'tables', component: TablesComponent }
];
