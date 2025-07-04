import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CacheService } from './cache.service';
import { ConnectivityService } from './connectivity.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(
    private http: HttpClient,
    private cache: CacheService,
    private connectivity: ConnectivityService
  ) {}

  verifyIntegrity(userId: string, version: string) {
    return this.http
      .post(`${environment.apiBaseUrl}/verify`, { userId, version })
      .toPromise();
  }

  fetchUserData(userId: string) {
    const cacheKey = `userdata_${userId}`;

    if (!this.connectivity.isOnline()) {
      const cached = this.cache.get<any[]>(cacheKey);
      return Promise.resolve(cached || []);
    }

    return this.http
      .get<any[]>(`${environment.apiBaseUrl}/userdata/${userId}`)
      .toPromise()
      .then((data) => {
        this.cache.set(cacheKey, data || []);
        return data;
      })
      .catch((err) => {
        const cached = this.cache.get<any[]>(cacheKey);
        return cached || Promise.reject(err);
      });
  }
}
