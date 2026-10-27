/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const THEME = {
  colors: {
    background: '#000000', // Negro absoluto para displays OLED de Wear OS
    surface: '#111827',
    surfaceVariant: '#1F2937',
    border: '#374151',

    // Enfoque y branding ErgoFocus
    primary: '#00E5FF',
    primaryDark: '#00838F',
    primaryLight: '#80DEEA',

    // Estados Semafóricos ErgoFocus
    optimal: '#10B981', // Verde esmeralda (< 65 dB / 300-500 lux)
    warning: '#F59E0B', // Ámbar (65-70 dB / fuera de rango lux)
    danger: '#EF4444',  // Rojo alerta (>= 70 dB / Sedentarismo >= 60m)

    // Modos
    focus: '#00E5FF',
    break: '#10B981',
    paused: '#F59E0B',

    // Tipografía
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textDim: '#475569',
  },
  dimensions: {
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    dialDiameter: Math.min(SCREEN_WIDTH, SCREEN_HEIGHT),
    circularPadding: Math.round(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.12),
  },
  typography: {
    fontFamilyBold: 'PlusJakartaSans_700Bold',
    fontFamilySemiBold: 'PlusJakartaSans_600SemiBold',
    fontFamilyMedium: 'PlusJakartaSans_500Medium',
    fontFamilyRegular: 'PlusJakartaSans_400Regular',
  },
};
