import axios from 'axios';

/**
 * Talks ONLY to the auth backend (Supabase signup + OTP login). Nothing else
 * in the Main Project uses this client — all existing clinic data stays on
 * localStorage via `@/utils/storage`.
 */
const baseURL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000/api';

export const apiClient = axios.create({ baseURL });
