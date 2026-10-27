/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Volume2, Sun, Armchair, ShieldCheck } from 'lucide-react-native';
import { useWatch } from '../context/WatchContext';
import { RoundScreenContainer } from '../components/RoundScreenContainer';
import { THEME } from '../styles/theme';

export const AmbientScreen: React.FC = () => {
  const { payload } = useWatch();
  const { ambient } = payload;

  // 1. Semáforo de Ruido:
  // Verde (< 65 dB), Amarillo (65-70 dB), Rojo (>= 70 dB)
  let noiseBadgeColor = THEME.colors.optimal;
  let noiseBadgeLabel = 'ÓPTIMO';
  if (ambient.noiseDb >= 70 || ambient.noiseStatus === 'danger') {
    noiseBadgeColor = THEME.colors.danger;
    noiseBadgeLabel = 'PELIGRO';
  } else if (ambient.noiseDb >= 65 || ambient.noiseStatus === 'warning') {
    noiseBadgeColor = THEME.colors.warning;
    noiseBadgeLabel = 'MODERADO';
  }

  // 2. Semáforo de Luz:
  // Verde (300-500 lux), Amarillo fuera de rango (< 300 o > 500)
  let lightBadgeColor = THEME.colors.optimal;
  let lightBadgeLabel = 'ADECUADO';
  if (ambient.lightLux < 300) {
    lightBadgeColor = THEME.colors.warning;
    lightBadgeLabel = 'DEFICIENTE';
  } else if (ambient.lightLux > 500) {
    lightBadgeColor = THEME.colors.warning;
    lightBadgeLabel = 'EXCESIVO';
  }

  // 3. Semáforo de Sedentarismo:
  // Minutos transcurridos desde el último movimiento
  let sedentaryBadgeColor = THEME.colors.optimal;
  let sedentaryBadgeLabel = 'ACTIVO';
  if (ambient.sedentaryMinutes >= 60 || ambient.sedentaryAlert) {
    sedentaryBadgeColor = THEME.colors.danger;
    sedentaryBadgeLabel = '¡LEVÁNTATE!';
  } else if (ambient.sedentaryMinutes >= 45) {
    sedentaryBadgeColor = THEME.colors.warning;
    sedentaryBadgeLabel = 'ATENCIÓN';
  }

  return (
    <RoundScreenContainer>
      <View style={styles.content}>
        {/* Encabezado */}
        <View style={styles.headerRow}>
          <ShieldCheck size={11} color="#00E5FF" />
          <Text style={styles.headerTitle}>SALUD AMBIENTAL</Text>
        </View>

        {/* 3 Tarjetas Compactas con Semáforos */}
        <View style={styles.cardsContainer}>
          {/* Tarjeta 1: Ruido */}
          <View style={styles.card}>
            <View style={styles.cardMetric}>
              <View style={[styles.iconWrapper, { backgroundColor: '#1E293B' }]}>
                <Volume2 size={13} color="#38BDF8" />
              </View>
              <Text style={styles.metricValue}>{ambient.noiseDb} dB</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: noiseBadgeColor }]}>
              <Text style={styles.badgeText}>{noiseBadgeLabel}</Text>
            </View>
          </View>

          {/* Tarjeta 2: Iluminación */}
          <View style={styles.card}>
            <View style={styles.cardMetric}>
              <View style={[styles.iconWrapper, { backgroundColor: '#1E293B' }]}>
                <Sun size={13} color="#FBBF24" />
              </View>
              <Text style={styles.metricValue}>{ambient.lightLux} lx</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: lightBadgeColor }]}>
              <Text style={styles.badgeText}>{lightBadgeLabel}</Text>
            </View>
          </View>

          {/* Tarjeta 3: Sedentarismo */}
          <View
            style={[
              styles.card,
              ambient.sedentaryAlert && { borderColor: '#EF4444', borderWidth: 1 },
            ]}
          >
            <View style={styles.cardMetric}>
              <View style={[styles.iconWrapper, { backgroundColor: '#1E293B' }]}>
                <Armchair size={13} color="#A78BFA" />
              </View>
              <Text style={styles.metricValue}>{ambient.sedentaryMinutes}m sentado</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: sedentaryBadgeColor }]}>
              <Text style={styles.badgeText}>{sedentaryBadgeLabel}</Text>
            </View>
          </View>
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
    gap: 4,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilyBold,
    color: '#00E5FF',
    letterSpacing: 0.8,
  },
  cardsContainer: {
    width: '100%',
    gap: 6,
    paddingHorizontal: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: THEME.typography.fontFamilySemiBold,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontFamily: THEME.typography.fontFamilyBold,
    letterSpacing: 0.3,
  },
});
