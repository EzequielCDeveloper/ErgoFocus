/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Play, Pause, Square, AlertCircle, Eye } from 'lucide-react-native';
import { useWatch } from '../context/WatchContext';
import { CircularGauge } from '../components/CircularGauge';
import { RoundScreenContainer } from '../components/RoundScreenContainer';
import { THEME } from '../styles/theme';

export const FocusScreen: React.FC = () => {
  const { payload, togglePause, finishSession } = useWatch();
  const { session } = payload;

  const totalSeconds = session.totalSeconds > 0 ? session.totalSeconds : 25 * 60;
  const remainingSeconds = Math.max(0, session.remainingSeconds);
  const elapsed = totalSeconds - remainingSeconds;
  const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0;

  // Formato mm:ss
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Determinar colores y etiqueta según estado
  let statusColor = THEME.colors.focus;
  let statusText = 'ENFOCADO';

  if (!session.isActive) {
    statusColor = THEME.colors.textMuted;
    statusText = 'EN ESPERA';
  } else if (session.isPaused) {
    statusColor = THEME.colors.paused;
    statusText = 'EN PAUSA';
  } else if (session.mode === 'break') {
    statusColor = THEME.colors.break;
    statusText = 'DESCANSO';
  }

  return (
    <RoundScreenContainer>
      <View style={styles.content}>
        {/* Encabezado Glanceable */}
        <View style={styles.headerRow}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>

        {/* Arco de Progreso Circular con Temporizador Centrado */}
        <View style={styles.gaugeContainer}>
          <CircularGauge
            progress={session.isActive ? progress : 0}
            size={146}
            strokeWidth={8}
            strokeColor={statusColor}
            trackColor="#1F2937"
          >
            <View style={styles.timerInner}>
              <Text style={styles.timerDigits}>{formattedTime}</Text>

              {/* Contador de Distracciones por Giroscopio */}
              <View style={styles.distractionBadge}>
                <Eye size={11} color={session.distractionsCount > 0 ? '#F59E0B' : '#94A3B8'} />
                <Text
                  style={[
                    styles.distractionText,
                    session.distractionsCount > 0 && { color: '#FCD34D' },
                  ]}
                >
                  {session.distractionsCount} dist.
                </Text>
              </View>
            </View>
          </CircularGauge>
        </View>

        {/* Botonera de Control de la Sesión */}
        <View style={styles.actionsRow}>
          {/* Botón Pausar / Reanudar */}
          <Pressable
            onPress={() => void togglePause()}
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryButton,
              { backgroundColor: session.isPaused ? '#F59E0B' : '#00E5FF' },
              pressed && styles.buttonPressed,
            ]}
          >
            {session.isPaused ? (
              <>
                <Play size={14} color="#000000" fill="#000000" />
                <Text style={styles.primaryButtonText}>Reanudar</Text>
              </>
            ) : (
              <>
                <Pause size={14} color="#000000" fill="#000000" />
                <Text style={styles.primaryButtonText}>Pausar</Text>
              </>
            )}
          </Pressable>

          {/* Botón Terminar Sesión */}
          {session.isActive && (
            <Pressable
              onPress={() => void finishSession()}
              style={({ pressed }) => [
                styles.actionButton,
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Square size={13} color="#EF4444" fill="#EF4444" />
            </Pressable>
          )}
        </View>
      </View>
    </RoundScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilyBold,
    letterSpacing: 0.8,
  },
  gaugeContainer: {
    marginVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerDigits: {
    fontSize: 32,
    fontFamily: THEME.typography.fontFamilyBold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  distractionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    marginTop: 3,
  },
  distractionText: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilyMedium,
    color: '#94A3B8',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    height: 34,
  },
  primaryButton: {
    paddingHorizontal: 16,
    gap: 5,
  },
  primaryButtonText: {
    color: '#000000',
    fontFamily: THEME.typography.fontFamilyBold,
    fontSize: 12,
  },
  secondaryButton: {
    width: 34,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#374151',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
