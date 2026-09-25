import { apiClient } from '@/config/api';
import type { AuthUser } from '@/utils/authStorage';

function extractMessage(err: unknown, fallback: string): string {
  const axiosMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return axiosMessage || fallback;
}

export const authService = {
  async signup(fullName: string, email: string): Promise<void> {
    try {
      await apiClient.post('/auth/signup', { fullName, email });
    } catch (err) {
      throw new Error(extractMessage(err, 'Could not create your account. Please try again.'));
    }
  },

  async requestOtp(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/login/request-otp', { email });
    } catch (err) {
      throw new Error(extractMessage(err, 'Could not send a verification code. Please try again.'));
    }
  },

  async verifyOtp(email: string, otp: string): Promise<{ token: string; user: AuthUser }> {
    try {
      const { data } = await apiClient.post('/auth/login/verify-otp', { email, otp });
      return data as { token: string; user: AuthUser };
    } catch (err) {
      throw new Error(extractMessage(err, 'Incorrect or expired code. Please try again.'));
    }
  },
};
