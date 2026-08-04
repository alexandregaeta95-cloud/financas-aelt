import React, { useState } from 'react';
import { ProfileTabProps, ProfileSubTab } from '../types/profile';
import { useProfile } from '../hooks/useProfile';
import ProfileHeader from './ProfileHeader';
import ProfileAvatar from './ProfileAvatar';
import ProfilePersonalInfo from './ProfilePersonalInfo';
import ProfilePreferences from './ProfilePreferences';
import ProfileNotifications from './ProfileNotifications';
import ProfileSecurity from './ProfileSecurity';
import ProfilePrivacy from './ProfilePrivacy';
import ProfileGoogleSheets from './ProfileGoogleSheets';
import ProfileAI from './ProfileAI';
import ProfileOCR from './ProfileOCR';
import ProfileRiskZones from './ProfileRiskZones';
import ProfileAgenda from './ProfileAgenda';
import ProfileBackup from './ProfileBackup';
import ProfileOpenFinance from './ProfileOpenFinance';
import ProfileAppearance from './ProfileAppearance';
import ProfilePermissions from './ProfilePermissions';
import ProfileAbout from './ProfileAbout';
import ProfileLogs from './ProfileLogs';
import ProfileDeveloper from './ProfileDeveloper';

export function ProfileTab(props: ProfileTabProps) {
  const {
    bankAccounts,
    setBankAccounts,
    creditCards,
    setCreditCards,
    avatarUrl,
    onAvatarChange,
    transactions,
    setTransactions,
    riskZones,
    setRiskZones,
    infractions,
    setInfractions,
    nonAppealed,
    setNonAppealed,
    registeredVehicles,
    setRegisteredVehicles,
    compromissos = [],
    securityConfig,
    setSecurityConfig,
    onTestLock,
    googleToken,
    googleUser,
    onGoogleLogin,
    onGoogleLogout,
    ipvaLeadDays = 30,
    setIpvaLeadDays,
    ipvaClosingDay = 15,
    setIpvaClosingDay,
    medicalAppointmentLeadDays = 2,
    setMedicalAppointmentLeadDays,
    notifyIpva = true,
    setNotifyIpva,
    notifyBudget = true,
    setNotifyBudget,
    notifyAppointments = true,
    setNotifyAppointments,
    dailyCheckInTime = '20:00',
    setDailyCheckInTime,
    defaultVehicleId = '',
    setDefaultVehicleId,
    licensingReminderDay = 10,
    setLicensingReminderDay,
    notifyLicensing = true,
    setNotifyLicensing,
    notifyCarServices = true,
    setNotifyCarServices,
    notifyMedical = true,
    setNotifyMedical,
    notifyRiskZones = true,
    setNotifyRiskZones,
    onReindexBankAccounts,
    onReindexCreditCards,
    showAlert,
    showConfirm
  } = props;

  const { profile, salvar, atualizar } = useProfile();
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('config');

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4">
      {/* Header & Sub-Tab Switcher */}
      <ProfileHeader
        userName={profile.nome}
        userEmail={profile.email}
        avatarUrl={avatarUrl || profile.avatarUrl}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
      />

      {/* Profile Avatar Editor Modal / Drawer */}
      <ProfileAvatar
        avatarUrl={avatarUrl || profile.avatarUrl}
        onAvatarChange={onAvatarChange}
        showAlert={showAlert}
      />

      {/* SubTab Content Sections */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <ProfilePersonalInfo
            profile={profile}
            onUpdate={salvar}
            showAlert={showAlert}
          />
          <ProfilePreferences
            profile={profile}
            onUpdate={salvar}
            showAlert={showAlert}
          />
          <ProfileSecurity
            securityConfig={securityConfig}
            setSecurityConfig={setSecurityConfig}
            onTestLock={onTestLock}
            showAlert={showAlert}
          />
          <ProfilePrivacy
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
          <ProfileRiskZones
            riskZones={riskZones}
            setRiskZones={setRiskZones}
            notifyRiskZones={notifyRiskZones}
            setNotifyRiskZones={setNotifyRiskZones}
            showAlert={showAlert}
          />
          <ProfileAgenda
            compromissos={compromissos}
            medicalAppointmentLeadDays={medicalAppointmentLeadDays}
            setMedicalAppointmentLeadDays={setMedicalAppointmentLeadDays}
            notifyAppointments={notifyAppointments}
            setNotifyAppointments={setNotifyAppointments}
            notifyMedical={notifyMedical}
            setNotifyMedical={setNotifyMedical}
            showAlert={showAlert}
          />
          <ProfileAppearance
            showAlert={showAlert}
          />
          <ProfilePermissions
            showAlert={showAlert}
          />
        </div>
      )}

      {activeSubTab === 'notificacoes' && (
        <div className="space-y-6 animate-fade-in">
          <ProfileNotifications
            notifyIpva={notifyIpva}
            setNotifyIpva={setNotifyIpva}
            notifyBudget={notifyBudget}
            setNotifyBudget={setNotifyBudget}
            notifyAppointments={notifyAppointments}
            setNotifyAppointments={setNotifyAppointments}
            notifyLicensing={notifyLicensing}
            setNotifyLicensing={setNotifyLicensing}
            notifyCarServices={notifyCarServices}
            setNotifyCarServices={setNotifyCarServices}
            notifyMedical={notifyMedical}
            setNotifyMedical={setNotifyMedical}
            notifyRiskZones={notifyRiskZones}
            setNotifyRiskZones={setNotifyRiskZones}
            ipvaLeadDays={ipvaLeadDays}
            setIpvaLeadDays={setIpvaLeadDays}
            medicalAppointmentLeadDays={medicalAppointmentLeadDays}
            setMedicalAppointmentLeadDays={setMedicalAppointmentLeadDays}
            dailyCheckInTime={dailyCheckInTime}
            setDailyCheckInTime={setDailyCheckInTime}
            licensingReminderDay={licensingReminderDay}
            setLicensingReminderDay={setLicensingReminderDay}
            showAlert={showAlert}
          />
        </div>
      )}

      {activeSubTab === 'metas' && (
        <div className="space-y-6 animate-fade-in">
          <ProfileOpenFinance
            bankAccounts={bankAccounts}
            creditCards={creditCards}
            onReindexBankAccounts={onReindexBankAccounts}
            onReindexCreditCards={onReindexCreditCards}
            showAlert={showAlert}
          />
        </div>
      )}

      {activeSubTab === 'integracoes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <ProfileGoogleSheets
            googleToken={googleToken}
            googleUser={googleUser}
            onGoogleLogin={onGoogleLogin}
            onGoogleLogout={onGoogleLogout}
            onConnectGoogleDrive={props.onConnectGoogleDrive}
            showAlert={showAlert}
          />
          <ProfileBackup
            googleToken={googleToken}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
          <ProfileAI
            showAlert={showAlert}
          />
          <ProfileOCR
            showAlert={showAlert}
          />
          <ProfileAbout
            showAlert={showAlert}
          />
          <ProfileLogs
            showAlert={showAlert}
          />
          <div className="lg:col-span-2">
            <ProfileDeveloper
              transactions={transactions}
              setTransactions={setTransactions}
              riskZones={riskZones}
              setRiskZones={setRiskZones}
              infractions={infractions}
              setInfractions={setInfractions}
              nonAppealed={nonAppealed}
              setNonAppealed={setNonAppealed}
              avatarUrl={avatarUrl || profile.avatarUrl}
              onAvatarChange={onAvatarChange}
              showAlert={showAlert}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(ProfileTab);
