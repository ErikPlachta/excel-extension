import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  verifyIntegrity(userId: string, version: string) {
    return this.http
      .post(`${environment.apiBaseUrl}/verify`, { userId, version })
      .toPromise();
  }

  fetchUserData(userId: string) {
    return this.http
      .get<any[]>(`${environment.apiBaseUrl}/userdata/${userId}`)
      .toPromise();
  }
}
