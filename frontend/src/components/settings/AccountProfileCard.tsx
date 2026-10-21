import type { AccountProfileField } from '@/types';
import { useRef } from 'react';
import { ImagePlus, RotateCcw, Camera } from 'lucide-react';
import { Field } from './Field';

interface Props {
  avatar: string;
  avatarDirty: boolean;
  avatarSaving: boolean;
  profileFields: AccountProfileField[];
  onChangeField: (index: number, value: string) => void;
  onChangeAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
  onSaveAvatar: () => void;
  onCancelAvatar: () => void;
}

export function AccountProfileCard({
  avatar, avatarDirty, avatarSaving, profileFields,
  onChangeField, onChangeAvatar, onRemoveAvatar, onSaveAvatar, onCancelAvatar,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="content-card identity-card">
      <div className="card-title">
        <div>
          <h2>◍ My Profile & Identity</h2>
          <p>Personal details shown on your staff badge, shift roster, and internal directory.</p>
        </div>
        <em>ACTIVE<br />STAFF</em>
      </div>
      <div className="avatar-row">
        {avatar ? (
          <img src={avatar} alt="Profile" />
        ) : (
          <div
            className="empty-avatar-circle"
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #cbd5e1',
              flexShrink: 0,
            }}
          >
            <Camera size={22} />
          </div>
        )}
        <div>
          <h3>Profile Photo</h3>
          <p>{avatarDirty ? 'New photo selected — save it to update your profile.' : 'Use a clear square image. Your photo is saved to your account.'}</p>
          <div className="profile-photo-actions">
            {avatarDirty ? (
              <>
                <button type="button" className="photo-save-button" disabled={avatarSaving} onClick={onSaveAvatar}>
                  {avatarSaving ? 'Saving…' : 'Save photo'}
                </button>
                <button type="button" disabled={avatarSaving} onClick={onCancelAvatar}>Cancel</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus size={14} /> {avatar ? 'Change photo' : 'Upload photo'}
                </button>
                {Boolean(avatar) && (
                  <button type="button" className="photo-reset-button" onClick={onRemoveAvatar}>
                    <RotateCcw size={13} /> Remove photo
                  </button>
                )}
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose profile photo"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onChangeAvatar(file);
                event.currentTarget.value = '';
              }}
            />
          </div>
        </div>
        <small>JPG, PNG or WebP · up to 5 MB</small>
      </div>
      <div className="form-grid">
        {profileFields.map((f, i) => (
          <Field
            key={f.label}
            label={f.label}
            value={f.value}
            wide={f.wide}
            onChange={f.readOnly ? undefined : (v) => onChangeField(i, v)}
          />
        ))}
      </div>
    </section>
  );
}