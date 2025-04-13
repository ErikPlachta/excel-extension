import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-online-status',
  standalone: false,
  templateUrl: './online-status.component.html',
  styleUrls: ['./online-status.component.css'],
})
export class OnlineStatusComponent implements OnInit {
  isOnline = navigator.onLine;

  ngOnInit(): void {
    window.addEventListener('online', () => (this.isOnline = true));
    window.addEventListener('offline', () => (this.isOnline = false));
  }
}
