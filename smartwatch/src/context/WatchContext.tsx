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
} from '../types';
import { wearableClient } from '../communication/wearableClient';

// Patrón de vibración háptica especificado en la sección 5 del documento técnico
const HAPTIC_ALERT_PATTERN = [0, 250, 100, 250];

// Estado inicial alineado a la especificación técnica de ErgoFocus
const INITIAL_STATE: SmartwatchStatePayload = {
  session: {
    isActive: true,
    isPaused: false,
    mode: 'focus',
    remainingSeconds: 18 * 60 + 42, // 18:42 del mockup oficial
    totalSeconds: 25 * 60,
    distractionsCount: 2,
  },
  ambient: {
    noiseDb: 54,
    noiseStatus: 'optimal',
    lightLux: 420,
    lightStatus: 'optimal',
    sedentaryMinutes: 45,
    sedentaryAlert: false,
  },
  syncedAt: Date.now(),
};

interface WatchContextValue {
  payload: SmartwatchStatePayload;
  connectionStatus: ConnectionStatus;
  isDemoMode: boolean;
  togglePause: () => Promise<void>;
  finishSession: () => Promise<void>;
  startBreak: (durationMinutes?: number) => Promise<void>;
  acknowledgeSedentary: () => Promise<void>;
  toggleDemoMode: () => void;
  triggerTestHaptic: () => void;
  simulatePhoneUpdate: (updater: (prev: SmartwatchStatePayload) => SmartwatchStatePayload) => void;
}

const WatchContext = createContext<WatchContextValue | null>(null);

export const WatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [payload, setPayload] = useState<SmartwatchStatePayload>(INITIAL_STATE);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true); // Activo por defecto para visualización inmediata

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

  // Temporizador local para modo Demo / Standalone cuando no hay conexión constante con el teléfono
  useEffect(() => {
    if (!isDemoMode || !payload.session.isActive || payload.session.isPaused) {
      return;
    }

    const interval = setInterval(() => {
      setPayload((prev) => {
        if (!prev.session.isActive || prev.session.isPaused) return prev;
        const remaining = Math.max(0, prev.session.remainingSeconds - 1);
        return {
          ...prev,
          session: {
            ...prev.session,
            remainingSeconds: remaining,
          },
          syncedAt: Date.now(),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDemoMode, payload.session.isActive, payload.session.isPaused]);

  // Acciones de Usuario (RPC hacia el móvil vía MessageClient)
  const togglePause = useCallback(async () => {
    await wearableClient.sendCommand({ type: 'TOGGLE_PAUSE' });

    // Actualización optimista local en caso de estar en modo demo o sin enlace activo
    if (isDemoMode) {
      setPayload((prev) => ({
        ...prev,
        session: {
          ...prev.session,
          isPaused: !prev.session.isPaused,
        },
      }));
    }
  }, [isDemoMode]);

  const finishSession = useCallback(async () => {
    await wearableClient.sendCommand({ type: 'FINISH_SESSION' });

    if (isDemoMode) {
      setPayload((prev) => ({
        ...prev,
        session: {
          ...prev.session,
          isActive: false,
          isPaused: false,
          remainingSeconds: 0,
        },
      }));
    }
  }, [isDemoMode]);

  const startBreak = useCallback(async (durationMinutes: number = 5) => {
    await wearableClient.sendCommand({
      type: 'START_BREAK',
      durationMinutes,
    });

    if (isDemoMode) {
      setPayload((prev) => ({
        ...prev,
        session: {
          isActive: true,
          isPaused: false,
          mode: 'break',
          remainingSeconds: durationMinutes * 60,
          totalSeconds: durationMinutes * 60,
          distractionsCount: prev.session.distractionsCount,
        },
      }));
    }
  }, [isDemoMode]);

  const acknowledgeSedentary = useCallback(async () => {
    await wearableClient.sendCommand({ type: 'ACKNOWLEDGE_SEDENTARY' });

    if (isDemoMode) {
      setPayload((prev) => ({
        ...prev,
        ambient: {
          ...prev.ambient,
          sedentaryMinutes: 0,
          sedentaryAlert: false,
        },
      }));
    }
  }, [isDemoMode]);

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
    togglePause,
    finishSession,
    startBreak,
    acknowledgeSedentary,
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
