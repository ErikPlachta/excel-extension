import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private msal = new PublicClientApplication({
    auth: {
      clientId: 'YOUR_CLIENT_ID', // TODO: Replace with Azure AD app client ID
      authority: 'https://login.microsoftonline.com/common', // or tenant ID
      redirectUri: 'https://localhost:4200', // TODO: Replace with your redirect URI
      // postLogoutRedirectUri: 'https://localhost:4200', // TODO: Replace with your post-logout redirect URI
      // navigateToLoginRequestUrl: false, // Optional: Set to false if you want to control the redirect after login
      // TODO: see other auth options we can add here.
    },
  });

  private currentUser: AccountInfo | null = null;

  // Reactive login state
  private loggedInSubject = new BehaviorSubject<boolean>(this.hasCachedUser());
  loggedIn$ = this.loggedInSubject.asObservable();

  private hasCachedUser(): boolean {
    return !!localStorage.getItem('user');
  }

  async login(): Promise<{ id: string; name: string } | null> {
    if (environment.simulateAuth) {
      const fakeUser = { id: 'fake-user-id', name: 'Simulated User' };
      localStorage.setItem('user', JSON.stringify(fakeUser));
      this.loggedInSubject.next(true);
      return fakeUser;
    }

    try {
      const result = await this.msal.loginPopup({ scopes: ['User.Read'] });
      this.currentUser = result.account!;
      const user = {
        id: this.currentUser.homeAccountId,
        name: this.currentUser.username,
      };
      localStorage.setItem('user', JSON.stringify(user));
      this.loggedInSubject.next(true);
      return user;
    } catch (err) {
      console.error('Login failed', err);
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem('user');
    this.loggedInSubject.next(false);
    if (!environment.simulateAuth) {
      this.msal.logoutPopup();
    }
  }

  isLoggedIn(): boolean {
    return !!this.getUser();
  }

  getUser(): { id: string; name: string } | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}
