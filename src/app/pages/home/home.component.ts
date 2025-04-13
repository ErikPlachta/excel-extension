import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  template: `<h2>Welcome, {{ user?.name }}</h2>`,
})
export class HomeComponent implements OnInit {
  user: { id: string; name: string } | null = null;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.user = this.auth.getUser();
  }
}
