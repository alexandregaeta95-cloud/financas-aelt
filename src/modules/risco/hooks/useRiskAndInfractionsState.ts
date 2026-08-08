import { useState } from 'react';
import { RiskZone, Infraction } from '../../../types';
import { initialRiskZones } from '../../../data/riskZones';
import { initialInfractions, nonAppealedInfractions } from '../../../data/infractions';

export function useRiskAndInfractionsState() {
  const [riskZones, setRiskZones] = useState<RiskZone[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_riskzones');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse risk zones state:", e);
    }
    return initialRiskZones;
  });

  const [infractions, setInfractions] = useState<Infraction[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_infractions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse infractions state:", e);
    }
    return initialInfractions;
  });

  const [nonAppealed, setNonAppealed] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_nonappealed');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse non-appealed infractions state:", e);
    }
    return nonAppealedInfractions;
  });

  return {
    riskZones,
    setRiskZones,
    infractions,
    setInfractions,
    nonAppealed,
    setNonAppealed,
  };
}
