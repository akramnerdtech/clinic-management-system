import { CheckCircle2 } from 'lucide-react';

export function CredentialingChecklist({ items }: { items: string[] }) {
  return (
    <section className="checklist-card">
      <h2><CheckCircle2 size={14} /> Credentialing Checklist</h2>
      <ul>
        {items.map((item) => (
          <li key={item}><CheckCircle2 size={12} /> {item}</li>
        ))}
      </ul>
    </section>
  );
}
