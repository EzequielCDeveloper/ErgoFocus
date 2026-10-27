/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface CircularGaugeProps {
  progress: number; // 0 a 1
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  gradientColors?: [string, string];
  trackColor?: string;
  children?: React.ReactNode;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  progress,
  size = 180,
  strokeWidth = 9,
  strokeColor = '#00E5FF',
  gradientColors,
  trackColor = '#1F2937',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Defs>
          {gradientColors && (
            <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors[0]} />
              <Stop offset="100%" stopColor={gradientColors[1]} />
            </LinearGradient>
          )}
        </Defs>

        {/* Círculo base (Pista de fondo) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Arco de progreso activo */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={gradientColors ? 'url(#gaugeGradient)' : strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      {/* Contenido centrado dentro del dial circular */}
      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
          width: size - strokeWidth * 2 - 12,
          height: size - strokeWidth * 2 - 12,
        }}
      >
        {children}
      </View>
    </View>
  );
};
