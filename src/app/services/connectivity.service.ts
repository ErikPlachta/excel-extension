import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, fromEvent, merge } from 'rxjs';
import { mapTo, startWith } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  online$ = this.onlineSubject.asObservable();

  constructor(private zone: NgZone) {
    const offline$ = fromEvent(window, 'offline').pipe(mapTo(false));
    const online$ = fromEvent(window, 'online').pipe(mapTo(true));
    merge(offline$, online$)
      .pipe(startWith(navigator.onLine))
      .subscribe((status) => {
        this.zone.run(() => this.onlineSubject.next(status));
      });
  }

  isOnline(): boolean {
    return this.onlineSubject.value;
  }
}
