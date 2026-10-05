import {
  getUserById,
  updateUserMetadata,
  updateUserPassword,
  signInWithPassword,
  uploadAvatarFile,
  removeAvatarFile,
} from "../services/supabaseService.js";
import { validateNewPassword } from "../utils/passwordPolicy.js";
import {
  validateProfileInput,
  sniffImageType,
  AVATAR_MAX_BYTES,
} from "../utils/accountValidation.js";
import { toUserPayload } from "../utils/userPayload.js";

/** GET /api/account/me — the authenticated user's saved account data. */
export async function getMe(req, res, next) {
  try {
    const user = await getUserById(req.userId);
    res.json({ user: toUserPayload(user) });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/account/profile — updates ONLY the authenticated user's profile fields. */
export async function updateProfile(req, res, next) {
  try {
    const { value, error } = validateProfileInput(req.body);
    if (error) return res.status(400).json({ message: error });

    const patch = {};
    if ("fullName" in value) patch.full_name = value.fullName;
    if ("phone" in value) patch.phone = value.phone || null;
    if ("extension" in value) patch.extension = value.extension || null;
    if ("about" in value) patch.about = value.about || null;

    const user = await updateUserMetadata(req.userId, patch);
    res.json({ message: "Profile updated.", user: toUserPayload(user) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/account/avatar — raw image bytes in the body (Content-Type: image/*).
 * Validates size + real file type, uploads, saves the URL on the user, then deletes the
 * previous image. If saving the URL fails, the just-uploaded file is removed again.
 */
export async function uploadAvatar(req, res, next) {
  let uploadedPath = null;
  try {
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return res
        .status(400)
        .json({ message: "Choose a JPG, PNG or WebP image." });
    }
    if (body.length > AVATAR_MAX_BYTES) {
      return res
        .status(413)
        .json({ message: "Image is too large. Maximum size is 2 MB." });
    }
    const type = sniffImageType(body);
    if (!type) {
      return res
        .status(400)
        .json({
          message: "Unsupported or corrupt image. Use a JPG, PNG or WebP file.",
        });
    }

    const current = await getUserById(req.userId);
    const previousPath = current.user_metadata?.avatar_path;

    const uploaded = await uploadAvatarFile(req.userId, body, type);
    uploadedPath = uploaded.path;

    const user = await updateUserMetadata(req.userId, {
      avatar_url: uploaded.url,
      avatar_path: uploaded.path,
    });
    uploadedPath = null; // committed — keep it

    if (previousPath && previousPath !== uploaded.path)
      await removeAvatarFile(previousPath);
    res.json({ message: "Profile photo updated.", user: toUserPayload(user) });
  } catch (err) {
    if (uploadedPath) await removeAvatarFile(uploadedPath);
    next(err);
  }
}

/** DELETE /api/account/avatar — resets to the default photo. */
export async function removeAvatar(req, res, next) {
  try {
    const current = await getUserById(req.userId);
    const previousPath = current.user_metadata?.avatar_path;
    const user = await updateUserMetadata(req.userId, {
      avatar_url: null,
      avatar_path: null,
    });
    await removeAvatarFile(previousPath);
    res.json({ message: "Profile photo removed.", user: toUserPayload(user) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/account/password — verifies the current password, then sets the new one. */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (typeof currentPassword !== "string" || !currentPassword) {
      return res
        .status(400)
        .json({
          message: "Enter your current password.",
          field: "currentPassword",
        });
    }
    const policyError = validateNewPassword(newPassword, confirmPassword);
    if (policyError) {
      return res
        .status(400)
        .json({
          message: policyError,
          field: policyError.startsWith("Passwords do not")
            ? "confirmPassword"
            : "newPassword",
        });
    }
    if (newPassword === currentPassword) {
      return res
        .status(400)
        .json({
          message: "New password must be different from your current password.",
          field: "newPassword",
        });
    }

    const user = await getUserById(req.userId);

    // Verify the current password against Supabase Auth using the account's own email.
    try {
      await signInWithPassword(user.email, currentPassword);
    } catch (err) {
      if (err.status === 401) {
        // 400 (not 401) so the client doesn't mistake this for an expired session.
        return res
          .status(400)
          .json({
            message: "Current password is incorrect.",
            field: "currentPassword",
          });
      }
      throw err;
    }

    await updateUserPassword(req.userId, newPassword);
    res.json({ message: "Password changed successfully." });
  } catch (err) {
    next(err);
  }
}
