import axios from "axios";
import { loadAuthSession } from "@/utils/authStorage";

/**
 * Talks to the CuraClinic backend: auth (OTP signup + login) and the authenticated
 * account-settings endpoints. Everything else in the Main Project stays on localStorage.
 */
const baseURL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:4000/api";

export const apiClient = axios.create({ baseURL });

export const SESSION_EXPIRED_EVENT = "curaclinic:session-expired";

// Account endpoints are authenticated with the session token (the server never trusts a userId from the client).
apiClient.interceptors.request.use((config) => {
  if (config.url?.startsWith("/account")) {
    const token = loadAuthSession()?.token;
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// An expired/invalid session on an account call signs the user out via the AuthProvider.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && error.config?.url?.startsWith("/account")) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);