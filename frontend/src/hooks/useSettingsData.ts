import { useState } from 'react';
import { settingsService } from '@/services/settingsService';
import { useToast } from '@/utils/toast';
import type { ClinicField } from '@/types';

/** Older saved values may start with decorative glyphs (e.g. "⌖ 450 Lexington…"); strip them. */
function cleanFields(fields: ClinicField[]): ClinicField[] {
  return fields.map((f) => ({ ...f, value: f.value.replace(/^[^\p{L}\p{N}+(]+/u, '').replace(/\(Main$/, '(Main Campus)') }));
}

export function useSettingsData() {
  const [tabs] = useState(() => settingsService.getTabs());
  const [identityFields, setIdentityFields] = useState(() => cleanFields(settingsService.getClinicIdentityFields()));
  const [scheduleRows] = useState(() => settingsService.getScheduleRows());
  const [durationOptions] = useState(() => settingsService.getDurationOptions());
  const [receptionDefaults, setReceptionDefaults] = useState(() => settingsService.getReceptionDefaults());
  const [campusInfo] = useState(() => settingsService.getCampusInfo());
  const [slotSaturationBars] = useState(() => settingsService.getSlotSaturationBars());
  const [complianceInfo] = useState(() => settingsService.getComplianceInfo());
  const [status, setStatus] = useState<string | null>(null);
  const toast = useToast();

  const updateIdentityField = (index: number, value: string) => {
    setIdentityFields((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)));
  };

  const toggleWalkInAutoCheckin = () => {
    setReceptionDefaults((prev) => ({
      ...prev,
      walkInAutoCheckin: { ...prev.walkInAutoCheckin, enabled: !prev.walkInAutoCheckin.enabled },
    }));
  };

  const saveChanges = () => {
    settingsService.saveClinicIdentityFields(identityFields);
    settingsService.saveReceptionDefaults(receptionDefaults);
    setStatus('Settings saved.');
    toast.success('Settings saved.');
  };

  const discardChanges = () => {
    setIdentityFields(cleanFields(settingsService.getClinicIdentityFields()));
    setReceptionDefaults(settingsService.getReceptionDefaults());
    setStatus('Changes discarded.');
    toast.info('Changes discarded.');
  };

  return {
    tabs,
    identityFields, updateIdentityField,
    scheduleRows, durationOptions,
    receptionDefaults, toggleWalkInAutoCheckin,
    campusInfo, slotSaturationBars, complianceInfo,
    status, saveChanges, discardChanges,
  };
}