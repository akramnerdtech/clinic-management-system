import { apiClient } from '@/config/api';
import type { AuthUser } from '@/utils/authStorage';

function extractMessage(err: unknown, fallback: string): string {
  const axiosMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return axiosMessage || fallback;
}

export const authService = {
  /** Signup step 1: Full Name + Email → emails a 6-digit OTP. No account is created yet. Also used for "Resend code". */
  async requestSignupOtp(fullName: string, email: string): Promise<void> {
    try {
      await apiClient.post('/auth/signup/request-otp', { fullName, email });
    } catch (err) {
      throw new Error(extractMessage(err, 'Could not send a verification code. Please try again.'));
    }
  },

  /** Signup step 2: Email + OTP → returns a short-lived token that unlocks the "set password" step. */
  async verifySignupOtp(email: string, otp: string): Promise<string> {
    try {
      const { data } = await apiClient.post('/auth/signup/verify-otp', { email, otp });
      return (data as { signupToken: string }).signupToken;
    } catch (err) {
      throw new Error(extractMessage(err, 'Incorrect or expired code. Please try again.'));
    }
  },

  /** Signup step 3: verified token + Password + Confirm Password → creates the account. */
  async setPassword(signupToken: string, password: string, confirmPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/signup/set-password', { signupToken, password, confirmPassword });
    } catch (err) {
      throw new Error(extractMessage(err, 'Could not create your account. Please try again.'));
    }
  },

  /** Login: Email + Password → session token + user. No OTP involved. */
  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      return data as { token: string; user: AuthUser };
    } catch (err) {
      throw new Error(extractMessage(err, 'Could not log you in. Please try again.'));
    }
  },
};