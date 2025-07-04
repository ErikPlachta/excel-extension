import { Component, OnInit } from '@angular/core';
import { ConnectivityService } from '../../services/connectivity.service';

@Component({
  selector: 'app-online-status',
  standalone: false,
  templateUrl: './online-status.component.html',
  styleUrls: ['./online-status.component.css'],
})
export class OnlineStatusComponent implements OnInit {
  isOnline = true;

  constructor(private connectivity: ConnectivityService) {}

  ngOnInit(): void {
    this.isOnline = this.connectivity.isOnline();
    this.connectivity.online$.subscribe((status) => (this.isOnline = status));
  }
}
