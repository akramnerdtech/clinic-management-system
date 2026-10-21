import { useState, useId } from 'react';
import {
  MessageCircle,
  Send,
  Copy,
  Check,
  ExternalLink,
  Phone,
  User,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { IconButton } from '@/components/ui/IconButton';
import {
  whatsappService,
  type AppointmentNotificationParams,
} from '@/services/whatsappService';
import { doctorsService } from '@/services/doctorsService';
import { useToast } from '@/utils/toast';

interface Props {
  params: AppointmentNotificationParams;
  onClose: () => void;
  isOpen?: boolean;
}

export function WhatsAppPromptModal({ params, onClose, isOpen = true }: Props) {
  const toast = useToast();
  const phoneInputId = useId();
  const autoOpenCheckboxId = useId();
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState(() =>
    whatsappService.getDoctorPhone(params.doctorName, params.doctorMobile)
  );
  const [autoOpen, setAutoOpen] = useState(() =>
    whatsappService.getAutoLaunch()
  );

  if (!isOpen) return null;

  const currentParams: AppointmentNotificationParams = {
    ...params,
    doctorMobile: customPhone,
  };

  const { message, url, hasPhone, cleanedPhone } =
    whatsappService.prepareNotification(currentParams);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('WhatsApp alert text copied to clipboard.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  const handleSendWhatsApp = () => {
    if (!hasPhone) {
      toast.error('Please enter a valid mobile number for the doctor.');
      return;
    }

    whatsappService.logNotification({
      doctorName: params.doctorName,
      doctorMobile: customPhone,
      patientName: params.patientName,
      date: params.date,
      timeSlot: params.timeSlot,
      message,
      status: 'sent',
    });

    whatsappService.openWhatsApp(url);
    toast.success(`WhatsApp opened for ${params.doctorName} (${cleanedPhone}).`);
  };

  const handleSavePhone = () => {
    if (!customPhone.trim()) {
      toast.error('Enter a mobile number to save.');
      return;
    }
    doctorsService.updateDoctorMobile(params.doctorName, customPhone.trim());
    toast.success(`Saved mobile number for ${params.doctorName}.`);
  };

  const handleToggleAutoOpen = (checked: boolean) => {
    setAutoOpen(checked);
    whatsappService.setAutoLaunch(checked);
  };

  return (
    <Modal
      title="WhatsApp Notification Push"
      subtitle={`Send instant appointment notification to ${params.doctorName}`}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
            <input
              type="checkbox"
              id={autoOpenCheckboxId}
              checked={autoOpen}
              onChange={(e) => handleToggleAutoOpen(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#10b981' }}
            />
            <label htmlFor={autoOpenCheckboxId} style={{ cursor: 'pointer' }}>
              Auto-launch WhatsApp on booking
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <IconButton className="white-button" onClick={onClose}>
              Done
            </IconButton>
            <IconButton
              className="teal-button"
              onClick={handleSendWhatsApp}
              style={{
                backgroundColor: '#10b981',
                borderColor: '#059669',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Send size={14} /> Send via WhatsApp
            </IconButton>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Doctor & Appointment Quick Overview Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(20, 184, 166, 0.04) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                <MessageCircle size={16} />
              </span>
              <div>
                <b style={{ fontSize: 15, color: '#064e3b' }}>{params.doctorName}</b>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 12,
                    backgroundColor: hasPhone ? '#dcfce7' : '#fee2e2',
                    color: hasPhone ? '#166534' : '#991b1b',
                  }}
                >
                  {hasPhone ? `WhatsApp: +${cleanedPhone}` : 'No Mobile Stored'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#475569', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <User size={12} color="#059669" /> Patient: <b>{params.patientName}</b>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} color="#059669" /> {params.date}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color="#059669" /> Slot: <b>{params.timeSlot}</b>
              </span>
            </div>
          </div>
        </div>

        {/* Doctor Phone Number Entry / Correction */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            htmlFor={phoneInputId}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Phone size={13} color="#10b981" /> Doctor Contact Mobile / WhatsApp Number
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id={phoneInputId}
              type="tel"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210 or 10-digit mobile"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 13,
              }}
            />
            <button
              type="button"
              className="white-button"
              onClick={handleSavePhone}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Save to Doctor
            </button>
          </div>
          <small style={{ fontSize: 11 }}>
            International numbers supported. For India: 10-digit number automatically gets +91.
          </small>
        </div>

        {/* WhatsApp Message Preview Bubble */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} color="#10b981" /> Notification Message Preview
            </span>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                background: 'none',
                border: 'none',
                color: '#059669',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
          </div>

          <div
            style={{
              backgroundColor: '#0b141a',
              borderRadius: 8,
              padding: 16,
              color: '#e9edef',
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid #202c33',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {message}
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} color="#10b981" /> Direct dispatch via Official WhatsApp Web or App
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              whatsappService.logNotification({
                doctorName: params.doctorName,
                doctorMobile: customPhone,
                patientName: params.patientName,
                date: params.date,
                timeSlot: params.timeSlot,
                message,
                status: 'sent',
              });
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: '#059669',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Open in new tab <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </Modal>
  );
}
