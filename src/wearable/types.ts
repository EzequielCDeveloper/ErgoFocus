/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SmartwatchUserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
}

export interface SmartwatchStats {
  todayFocusMinutes: number;
  todayDistractions: number;
  streakDays: number;
  weeklyFocusMinutes: number;
}

export interface SmartwatchStatePayload {
  session: {
    isActive: boolean;
    isPaused: boolean;
    mode: 'focus' | 'break';
    remainingSeconds: number;
    totalSeconds: number;
    distractionsCount: number;
  };
  ambient: {
    noiseDb: number;
    noiseStatus: 'optimal' | 'warning' | 'danger';
    lightLux: number;
    lightStatus: 'optimal' | 'warning';
    sedentaryMinutes: number;
    sedentaryAlert: boolean;
  };
  user?: SmartwatchUserProfile | null;
  stats?: SmartwatchStats | null;
  syncedAt: number; // Unix timestamp
}

export type SmartwatchCommand =
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'FINISH_SESSION' }
  | { type: 'START_BREAK'; durationMinutes: number }
  | { type: 'ACKNOWLEDGE_SEDENTARY' }
  | { type: 'REQUEST_STATS' }
  | { type: 'REQUEST_USER_INFO' };

export const WEARABLE_STATE_PATH = '/ergofocus/state';
export const WEARABLE_COMMAND_PATH = '/ergofocus/command';
