/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Vibration } from 'react-native';
import {
  ConnectionStatus,
  SmartwatchCommand,
  SmartwatchStatePayload,
  SmartwatchStats,
  SmartwatchUserProfile,
} from '../types';
import { wearableClient } from '../communication/wearableClient';
import { useAuth } from '../auth/AuthContext';

// Patrón de vibración háptica especificado en la sección 5 del documento técnico
const HAPTIC_ALERT_PATTERN = [0, 250, 100, 250];

// Estado inicial para modo desconectado - espera datos reales del móvil
const INITIAL_STATE: SmartwatchStatePayload = {
  session: {
    isActive: false,
    isPaused: false,
    mode: 'focus',
    remainingSeconds: 0,
    totalSeconds: 0,
    distractionsCount: 0,
  },
  ambient: {
    noiseDb: 0,
    noiseStatus: 'optimal',
    lightLux: 0,
    lightStatus: 'optimal',
    sedentaryMinutes: 0,
    sedentaryAlert: false,
  },
  user: null,
  stats: null,
  syncedAt: Date.now(),
};

interface WatchContextValue {
  payload: SmartwatchStatePayload;
  connectionStatus: ConnectionStatus;
  isDemoMode: boolean;
  user: SmartwatchUserProfile | null;
  stats: SmartwatchStats | null;
  togglePause: () => Promise<void>;
  finishSession: () => Promise<void>;
  startBreak: (durationMinutes?: number) => Promise<void>;
  acknowledgeSedentary: () => Promise<void>;
  requestStats: () => Promise<void>;
  requestUserInfo: () => Promise<void>;
  toggleDemoMode: () => void;
  triggerTestHaptic: () => void;
  simulatePhoneUpdate: (updater: (prev: SmartwatchStatePayload) => SmartwatchStatePayload) => void;
}

const WatchContext = createContext<WatchContextValue | null>(null);

export const WatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [payload, setPayload] = useState<SmartwatchStatePayload>(INITIAL_STATE);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const authUser: SmartwatchUserProfile | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? null,
        displayName:
          (session.user.user_metadata?.full_name as string | undefined) ||
          (session.user.user_metadata?.name as string | undefined) ||
          null,
      }
    : null;

  const user = payload.user ?? authUser;
  const stats = payload.stats ?? null;

  const prevSedentaryAlertRef = useRef(false);
  const prevNoiseStatusRef = useRef<'optimal' | 'warning' | 'danger'>('optimal');
  const lastVibrationTimeRef = useRef(0);

  // Lógica de Hápticos Silenciosos en muñeca según Sección 5
  // Si sedentaryAlert == true o ambient.noiseStatus == 'danger' en un nuevo payload,
  // invoca Vibration.vibrate([0, 250, 100, 250])
  const checkAndTriggerHaptics = useCallback((newPayload: SmartwatchStatePayload) => {
    const isSedentaryTrigger =
      newPayload.ambient.sedentaryAlert && !prevSedentaryAlertRef.current;
    const isNoiseDangerTrigger =
      newPayload.ambient.noiseStatus === 'danger' &&
      prevNoiseStatusRef.current !== 'danger';

    const now = Date.now();
    // Cooldown de 5 segundos para evitar saturación de vibraciones continuas
    if ((isSedentaryTrigger || isNoiseDangerTrigger) && now - lastVibrationTimeRef.current > 5000) {
      lastVibrationTimeRef.current = now;
      Vibration.vibrate(HAPTIC_ALERT_PATTERN);
    }

    prevSedentaryAlertRef.current = newPayload.ambient.sedentaryAlert;
    prevNoiseStatusRef.current = newPayload.ambient.noiseStatus;
  }, []);

  // 1. Montaje: Suscripción al listener del DataClient de Wearable API / Web Bridge
  useEffect(() => {
    const unsubscribe = wearableClient.subscribe((incoming) => {
      setPayload(incoming);
      setConnectionStatus('connected');
      setIsDemoMode(false);
      checkAndTriggerHaptics(incoming);
    });

    return unsubscribe;
  }, [checkAndTriggerHaptics]);

  // Acciones de Usuario (RPC hacia el móvil vía MessageClient)
  const togglePause = useCallback(async () => {
    await wearableClient.sendCommand({ type: 'TOGGLE_PAUSE' });
  }, []);

  const finishSession = useCallback(async () => {
    await wearableClient.sendCommand({ type: 'FINISH_SESSION' });
  }, []);

  const startBreak = useCallback(async (durationMinutes: number = 5) => {
    await wearableClient.sendCommand({
      type: 'START_BREAK',
      durationMinutes,
    });
  }, []);

  const acknowledgeSedentary = useCallback(async () => {
    await wearableClient.sendCommand({ type: 'ACKNOWLEDGE_SEDENTARY' });
  }, []);

  const requestStats = useCallback(async () => {
    await wearableClient.sendCommand({ type: 'REQUEST_STATS' });
  }, []);

  const requestUserInfo = useCallback(async () => {
    await wearableClient.sendCommand({ type: 'REQUEST_USER_INFO' });
  }, []);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => !prev);
  }, []);

  const triggerTestHaptic = useCallback(() => {
    Vibration.vibrate(HAPTIC_ALERT_PATTERN);
  }, []);

  const simulatePhoneUpdate = useCallback((updater: (prev: SmartwatchStatePayload) => SmartwatchStatePayload) => {
    setPayload((prev) => {
      const updated = updater(prev);
      checkAndTriggerHaptics(updated);
      return updated;
    });
  }, [checkAndTriggerHaptics]);

  const value: WatchContextValue = {
    payload,
    connectionStatus,
    isDemoMode,
    user,
    stats,
    togglePause,
    finishSession,
    startBreak,
    acknowledgeSedentary,
    requestStats,
    requestUserInfo,
    toggleDemoMode,
    triggerTestHaptic,
    simulatePhoneUpdate,
  };

  return <WatchContext.Provider value={value}>{children}</WatchContext.Provider>;
};

export function useWatch(): WatchContextValue {
  const context = useContext(WatchContext);
  if (!context) {
    throw new Error('useWatch must be used within a WatchProvider');
  }
  return context;
}
