import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { LogoutComponent } from './pages/logout/logout.component';
import { HelpComponent } from './pages/help/help.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { HomeComponent } from './pages/home/home.component';
import { TabNewComponent } from './pages/tab-new/tab-new.component';
import { TabManageComponent } from './pages/tab-manage/tab-manage.component';
import { AuthGuard } from './services/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LogoutComponent },
  { path: 'help', component: HelpComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'tab-new', component: TabNewComponent, canActivate: [AuthGuard] },
  {
    path: 'tab-manage',
    component: TabManageComponent,
    canActivate: [AuthGuard],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true, //useHash: true ensures routes like /tab-new become /#/tab-new, and Angular no longer uses pushState, avoiding your Excel iframe crash.
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
