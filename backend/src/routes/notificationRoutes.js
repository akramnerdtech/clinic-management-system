import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimitPerUser } from '../middleware/rateLimit.js';
import { syncAppointment, saveDoctorContact, renameDoctorContact } from '../controllers/notificationController.js';

const router = Router();

// Same rule as the account routes: the user comes ONLY from the verified session token.
router.use(requireAuth);
router.use(rateLimitPerUser({ limit: 120, windowMs: 60_000 }));

router.post('/appointments/sync', syncAppointment); // appointment booked / edited / status changed / deleted
router.post('/doctors', saveDoctorContact);         // doctor's mobile from the Add Doctor form
router.post('/doctors/rename', renameDoctorContact); // keep SMS working after a doctor is renamed

export default router;
