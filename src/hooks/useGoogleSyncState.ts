import { useState, useEffect } from 'react';
import { PendingChange } from '../types';
import { DEFAULT_SPREADSHEET_URL, DEFAULT_APPS_SCRIPT_URL } from '../lib/googleAuth';

export function useGoogleSyncState() {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return localStorage.getItem('wealthflow_apps_script_url') || 
           localStorage.getItem('wealthflow_spreadsheet_url') || 
           localStorage.getItem('wealthflow_google_access_token') || 
           DEFAULT_APPS_SCRIPT_URL;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('wealthflow_spreadsheet_url') || DEFAULT_SPREADSHEET_URL;
  });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    return localStorage.getItem('wealthflow_last_synced_time') || '';
  });
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    return localStorage.getItem('wealthflow_auto_sync') === 'true';
  });
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState<boolean>(false);

  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_pending_changes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showSyncQueueModal, setShowSyncQueueModal] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_pending_changes', JSON.stringify(pendingChanges));
    } catch (e) {}
  }, [pendingChanges]);

  return {
    googleUser,
    setGoogleUser,
    googleToken,
    setGoogleToken,
    isSyncing,
    setIsSyncing,
    isImporting,
    setIsImporting,
    spreadsheetUrl,
    setSpreadsheetUrl,
    syncError,
    setSyncError,
    lastSyncedTime,
    setLastSyncedTime,
    autoSync,
    setAutoSync,
    isGoogleDriveModalOpen,
    setIsGoogleDriveModalOpen,
    pendingChanges,
    setPendingChanges,
    isOnline,
    setIsOnline,
    showSyncQueueModal,
    setShowSyncQueueModal,
  };
}
