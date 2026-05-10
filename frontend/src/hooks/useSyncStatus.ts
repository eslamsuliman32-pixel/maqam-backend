
import { useState, useEffect } from 'react';
import { subscribeToSyncStatus } from '../services/firebaseSync';

export const useSyncStatus = () => {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  useEffect(() => {
    return subscribeToSyncStatus(setStatus);
  }, []);

  return status;
};
