import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

// This backend's only job: authentication (email-OTP-verified signup + email/password login).
// It deliberately exposes nothing else — no clinic data, no other resources.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes); // authenticated account settings (profile, avatar, password)

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`CuraClinic auth backend listening on port ${env.port}`);
});