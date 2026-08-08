import { useState, useEffect } from 'react';
import { SecurityConfig } from '../../../types';

export function useProfileSettingsState() {
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    const saved = localStorage.getItem('wealthflow_avatarurl');
    return saved || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDclcawui2tKuHgw4p_DWvKBp0R7XYoJIo41kp-qWXzNhTbDso-7IAoirqhYyc-HEWXFiHIGP6YdyvyG4u4xgKT0ecq0uBLAJEXGIxgaymfedUvUw5PmlAfsh600Je_GbTdL8UgPj2BZ18ovSoiV_-08bm1CxxuR-RaAO569na_pVi2ObUv5FfHdqk1JhAf68RSSZF5WqsPDCCmYfWunTzLuQcRHOJn29EvtKwGGBucDh8ZAdyadLyd';
  });

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [categoryBudgets, setCategoryBudgets] = useState<{ [category: string]: number }>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_category_budgets');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_category_budgets', JSON.stringify(categoryBudgets));
    } catch (e) {
      console.warn("Failed to save category budgets to localStorage:", e);
    }
  }, [categoryBudgets]);

  const [ipvaLeadDays, setIpvaLeadDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_ipva_lead_days');
      return saved ? parseInt(saved, 10) : 30;
    } catch {
      return 30;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_ipva_lead_days', String(ipvaLeadDays));
    } catch (e) {
      console.warn("Failed to save ipva lead days to localStorage:", e);
    }
  }, [ipvaLeadDays]);

  useEffect(() => {
    try {
      const mileageStr = localStorage.getItem('wealthflow_vehicle_mileage');
      if (mileageStr) {
        const mileage = JSON.parse(mileageStr);
        if (mileage && mileage['FOX PRATA'] !== undefined) {
          delete mileage['FOX PRATA'];
          localStorage.setItem('wealthflow_vehicle_mileage', JSON.stringify(mileage));
        }
      }
    } catch (e) {
      console.warn("Cleanup of FOX PRATA mileage failed:", e);
    }
  }, []);

  const [ipvaClosingDay, setIpvaClosingDay] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_ipva_closing_day');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_ipva_closing_day', String(ipvaClosingDay));
    } catch (e) {
      console.warn("Failed to save ipva closing day to localStorage:", e);
    }
  }, [ipvaClosingDay]);

  const [ipvaNotificationColor, setIpvaNotificationColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_ipva_notification_color');
      return saved || 'orange';
    } catch {
      return 'orange';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_ipva_notification_color', ipvaNotificationColor);
    } catch (e) {
      console.warn("Failed to save ipva notification color to localStorage:", e);
    }
  }, [ipvaNotificationColor]);

  const [dailyCheckInTime, setDailyCheckInTime] = useState<string>(() => {
    try {
      return localStorage.getItem('wealthflow_daily_checkin_time') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_daily_checkin_time', dailyCheckInTime);
    } catch (e) {
      console.warn("Failed to save checkin time to localStorage:", e);
    }
  }, [dailyCheckInTime]);

  const [medicalAppointmentLeadDays, setMedicalAppointmentLeadDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_medical_appointment_lead_days');
      return saved ? parseInt(saved, 10) : 2;
    } catch {
      return 2;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_medical_appointment_lead_days', String(medicalAppointmentLeadDays));
    } catch (e) {
      console.warn("Failed to save medical appointment lead days to localStorage:", e);
    }
  }, [medicalAppointmentLeadDays]);

  const [notifyIpva, setNotifyIpva] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_ipva');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [defaultVehicleId, setDefaultVehicleId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_default_vehicle_id');
      return saved || '';
    } catch {
      return '';
    }
  });

  const [licensingReminderDay, setLicensingReminderDay] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_licensing_reminder_day');
      return saved ? parseInt(saved, 10) : 10;
    } catch {
      return 10;
    }
  });

  const [notifyLicensing, setNotifyLicensing] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_licensing');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_default_vehicle_id', defaultVehicleId);
    } catch (e) {
      console.warn("Failed to save defaultVehicleId:", e);
    }
  }, [defaultVehicleId]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_licensing_reminder_day', String(licensingReminderDay));
    } catch (e) {
      console.warn("Failed to save licensingReminderDay:", e);
    }
  }, [licensingReminderDay]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_licensing', String(notifyLicensing));
    } catch (e) {
      console.warn("Failed to save notifyLicensing:", e);
    }
  }, [notifyLicensing]);

  const [notifyBudget, setNotifyBudget] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_budget');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [notifyAppointments, setNotifyAppointments] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_appointments');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [notifyCarServices, setNotifyCarServices] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_car_services');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [notifyMedical, setNotifyMedical] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_medical');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [notifyRiskZones, setNotifyRiskZones] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_risk_zones');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_ipva', String(notifyIpva));
    } catch (e) {
      console.warn("Failed to save notifyIpva to localStorage:", e);
    }
  }, [notifyIpva]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_budget', String(notifyBudget));
    } catch (e) {
      console.warn("Failed to save notifyBudget to localStorage:", e);
    }
  }, [notifyBudget]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_appointments', String(notifyAppointments));
    } catch (e) {
      console.warn("Failed to save notifyAppointments to localStorage:", e);
    }
  }, [notifyAppointments]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_car_services', String(notifyCarServices));
    } catch (e) {
      console.warn("Failed to save notifyCarServices to localStorage:", e);
    }
  }, [notifyCarServices]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_medical', String(notifyMedical));
    } catch (e) {
      console.warn("Failed to save notifyMedical to localStorage:", e);
    }
  }, [notifyMedical]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_risk_zones', String(notifyRiskZones));
    } catch (e) {
      console.warn("Failed to save notifyRiskZones to localStorage:", e);
    }
  }, [notifyRiskZones]);

  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_security_config');
      return saved ? JSON.parse(saved) : {
        enabled: false,
        mode: 'PIN',
        password: 'admin',
        pin: '1234',
        biometricType: 'FACE_ID'
      };
    } catch {
      return {
        enabled: false,
        mode: 'PIN',
        password: 'admin',
        pin: '1234',
        biometricType: 'FACE_ID'
      };
    }
  });

  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_security_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.enabled;
      }
    } catch {}
    return false;
  });

  return {
    avatarUrl,
    setAvatarUrl,
    customCategories,
    setCustomCategories,
    categoryBudgets,
    setCategoryBudgets,
    ipvaLeadDays,
    setIpvaLeadDays,
    ipvaClosingDay,
    setIpvaClosingDay,
    ipvaNotificationColor,
    setIpvaNotificationColor,
    dailyCheckInTime,
    setDailyCheckInTime,
    medicalAppointmentLeadDays,
    setMedicalAppointmentLeadDays,
    notifyIpva,
    setNotifyIpva,
    defaultVehicleId,
    setDefaultVehicleId,
    licensingReminderDay,
    setLicensingReminderDay,
    notifyLicensing,
    setNotifyLicensing,
    notifyBudget,
    setNotifyBudget,
    notifyAppointments,
    setNotifyAppointments,
    notifyCarServices,
    setNotifyCarServices,
    notifyMedical,
    setNotifyMedical,
    notifyRiskZones,
    setNotifyRiskZones,
    securityConfig,
    setSecurityConfig,
    isAppLocked,
    setIsAppLocked,
  };
}
