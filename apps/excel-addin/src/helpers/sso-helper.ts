import { getMockSsoResult } from "./sso-mock";
import { fetchTokenFromMiddleTier, getUserProfileFromGraph } from "../middle-tier/app";

export interface SsoUserProfile {
  id: string;
  displayName: string;
  email: string;
  roles: string[];
}

export interface SsoAuthResult {
  user: SsoUserProfile;
  accessToken: string;
}

export async function getSsoAuthResult(): Promise<SsoAuthResult> {
  // For now we keep the client-side mock as the source of truth,
  // but shape the calls to mirror a middle-tier token + Graph flow.
  const result = await getMockSsoResult();
  return {
    user: {
      id: result.user.id,
      displayName: result.user.displayName,
      email: result.user.email,
      roles: result.user.roles,
    },
    accessToken: result.accessToken,
  };
}

export async function getAccessToken(): Promise<string> {
  // In the future, this would call fetchTokenFromMiddleTier() directly.
  // We still delegate to getSsoAuthResult so the UI remains consistent.
  const token = await fetchTokenFromMiddleTier();
  return token;
}

export async function getUserProfile(): Promise<SsoUserProfile> {
  const token = await getAccessToken();
  const profile = await getUserProfileFromGraph(token);
  return {
    id: profile.id,
    displayName: profile.displayName,
    email: profile.mail,
    roles: [],
  };
}
