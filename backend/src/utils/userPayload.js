/** The only shape in which a user is ever returned to the client — no secrets, no password data. */
export function toUserPayload(user) {
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email,
    fullName: meta.full_name || '',
    phone: meta.phone || '',
    extension: meta.extension || '',
    about: meta.about || '',
    avatarUrl: meta.avatar_url || null,
  };
}