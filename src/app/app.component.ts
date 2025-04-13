import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  isLoggedIn = false;

  constructor(private auth: AuthService) {
    this.auth.loggedIn$.subscribe((state) => {
      this.isLoggedIn = state;
    });
  }
}
