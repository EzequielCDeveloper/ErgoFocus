/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import {
  SmartwatchCommand,
  SmartwatchStatePayload,
} from './types';
import { wearableService } from './wearableService';

export interface UseWearableSyncOptions {
  session: {
    isActive: boolean;
    isPaused: boolean;
    mode: 'focus' | 'break';
    remainingSeconds: number;
    totalSeconds: number;
    distractionsCount: number;
  };
  ambient: {
    noiseDb: number | null;
    lightLux: number | null;
    sedentaryMinutes: number;
    sedentaryAlert: boolean;
  };
  onCommand?: (command: SmartwatchCommand) => void;
}

export function useWearableSync({
  session,
  ambient,
  onCommand,
}: UseWearableSyncOptions) {
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  // Escuchar comandos entrantes desde el reloj
  useEffect(() => {
    const unsubscribe = wearableService.onCommand((cmd) => {
      if (onCommandRef.current) {
        onCommandRef.current(cmd);
      }
    });
    return unsubscribe;
  }, []);

  // Sincronizar estado cada vez que cambien los datos clave o periódicamente
  useEffect(() => {
    const noiseDb = ambient.noiseDb ?? 0;
    const lightLux = ambient.lightLux ?? 0;

    const payload: SmartwatchStatePayload = {
      session: {
        isActive: session.isActive,
        isPaused: session.isPaused,
        mode: session.mode,
        remainingSeconds: session.remainingSeconds,
        totalSeconds: session.totalSeconds,
        distractionsCount: session.distractionsCount,
      },
      ambient: {
        noiseDb: Math.round(noiseDb),
        noiseStatus: wearableService.calculateNoiseStatus(ambient.noiseDb),
        lightLux: Math.round(lightLux),
        lightStatus: wearableService.calculateLightStatus(ambient.lightLux),
        sedentaryMinutes: Math.round(ambient.sedentaryMinutes),
        sedentaryAlert: ambient.sedentaryAlert,
      },
      syncedAt: Date.now(),
    };

    void wearableService.syncState(payload);
  }, [
    session.isActive,
    session.isPaused,
    session.mode,
    session.remainingSeconds,
    session.totalSeconds,
    session.distractionsCount,
    ambient.noiseDb,
    ambient.lightLux,
    ambient.sedentaryMinutes,
    ambient.sedentaryAlert,
  ]);
}
