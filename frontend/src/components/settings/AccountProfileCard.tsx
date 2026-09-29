import type { AccountProfileField } from '@/types';
import { useRef } from 'react';
import { ImagePlus, RotateCcw } from 'lucide-react';
import { Field } from './Field';

interface Props {
  avatar: string;
  profileFields: AccountProfileField[];
  onChangeField: (index: number, value: string) => void;
  onChangeAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
}

export function AccountProfileCard({ avatar, profileFields, onChangeField, onChangeAvatar, onRemoveAvatar }: Props) {
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
        <img src={avatar} alt="Profile" />
        <div>
          <h3>Profile Photo</h3>
          <p>Use a clear square image. Your photo is stored in this browser.</p>
          <div className="profile-photo-actions">
            <button type="button" onClick={() => fileInputRef.current?.click()}><ImagePlus size={14} /> Change photo</button>
            <button type="button" className="photo-reset-button" onClick={onRemoveAvatar}><RotateCcw size={13} /> Remove photo</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="Choose profile photo"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onChangeAvatar(file);
                event.currentTarget.value = '';
              }}
            />
          </div>
        </div>
        <small>Up to 8 MB · resized for storage</small>
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
