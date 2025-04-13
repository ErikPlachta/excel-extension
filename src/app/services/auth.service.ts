import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private msalInstance = new PublicClientApplication({
    auth: {
      clientId: 'YOUR_CLIENT_ID',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: 'https://localhost:3000',
    },
  });

  private currentUser: AccountInfo | null = null;

  isSimulated(): boolean {
    return environment.simulateAuth;
  }

  async login(): Promise<{ id: string; name: string } | null> {
    if (this.isSimulated()) {
      const fakeUser = { id: 'fake-user-id', name: 'Simulated User' };
      localStorage.setItem('user', JSON.stringify(fakeUser));
      return fakeUser;
    }

    try {
      const result = await this.msalInstance.loginPopup({
        scopes: ['User.Read'],
      });
      this.currentUser = result.account!;
      const user = {
        id: this.currentUser.homeAccountId,
        name: this.currentUser.username,
      };
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (err) {
      console.error('Login failed', err);
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem('user');
    if (!this.isSimulated()) {
      this.msalInstance.logoutPopup();
    }
  }

  getUser(): { id: string; name: string } | null {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getUser();
  }
}
