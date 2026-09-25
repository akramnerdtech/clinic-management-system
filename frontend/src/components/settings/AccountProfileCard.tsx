import type { AccountProfileField } from '@/types';
import { Field } from './Field';
import { useToast } from '@/utils/toast';

interface Props {
  avatar: string;
  profileFields: AccountProfileField[];
  onChangeField: (index: number, value: string) => void;
}

export function AccountProfileCard({ avatar, profileFields, onChangeField }: Props) {
  const toast = useToast();

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
          <p>Visible to clinic staff in the sidebar, shift roster, and internal directory search.</p>
          <button onClick={() => toast.info('Photo uploads require a connected file store — not available in this demo.')}>Change Photo</button>{' '}
          <b onClick={() => toast.info('Profile photo removed (demo only — not persisted).')}>Remove</b>
        </div>
        <small>Recommended 256×256 JPG or PNG</small>
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
