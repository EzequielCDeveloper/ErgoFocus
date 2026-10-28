/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import {
  SmartwatchCommand,
  SmartwatchStatePayload,
  SmartwatchUserProfile,
  SmartwatchStats,
} from './types';
import { wearableService } from './wearableService';
import { getUserFocusStats } from '../db/repos';

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
  user?: SmartwatchUserProfile | null;
  stats?: SmartwatchStats | null;
  onCommand?: (command: SmartwatchCommand) => void;
}

export function useWearableSync({
  session,
  ambient,
  user,
  stats,
  onCommand,
}: UseWearableSyncOptions) {
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const [dbStats, setDbStats] = useState<SmartwatchStats | null>(null);
  const [lastStatsFetch, setLastStatsFetch] = useState(0);

  const fetchDbStats = async () => {
    if (!user?.id) {
      setDbStats(null);
      return;
    }
    try {
      const stats = await getUserFocusStats(user.id);
      setDbStats(stats);
      setLastStatsFetch(Date.now());
    } catch (err) {
      console.warn('[useWearableSync] Error fetching DB stats:', err);
    }
  };

  // Fetch stats when user changes
  useEffect(() => {
    if (user?.id) {
      void fetchDbStats();
    } else {
      setDbStats(null);
    }
  }, [user?.id]);

  // Escuchar comandos entrantes desde el reloj
  useEffect(() => {
    const unsubscribe = wearableService.onCommand((cmd) => {
      if (onCommandRef.current) {
        onCommandRef.current(cmd);
      }
      if (cmd.type === 'REQUEST_STATS' || cmd.type === 'REQUEST_USER_INFO') {
        void fetchDbStats();
      }
    });
    return unsubscribe;
  }, [user?.id]);

  // Sincronizar estado cada vez que cambien los datos clave o periódicamente
  useEffect(() => {
    const noiseDb = ambient.noiseDb ?? 0;
    const lightLux = ambient.lightLux ?? 0;

    const mergedStats: SmartwatchStats | null = dbStats || stats || null;

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
      user: user ?? null,
      stats: mergedStats,
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
    user?.id,
    user?.email,
    user?.displayName,
    stats?.todayFocusMinutes,
    stats?.todayDistractions,
    stats?.streakDays,
    stats?.weeklyFocusMinutes,
    dbStats?.todayFocusMinutes,
    dbStats?.todayDistractions,
    dbStats?.streakDays,
    dbStats?.weeklyFocusMinutes,
    lastStatsFetch,
  ]);
}
