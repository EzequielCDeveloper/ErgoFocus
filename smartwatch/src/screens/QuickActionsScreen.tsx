/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Coffee,
  Footprints,
  Bluetooth,
  Vibrate,
  Sliders,
  Check,
  User,
  BarChart3,
  RotateCcw,
  LogOut,
} from 'lucide-react-native';
import { useWatch } from '../context/WatchContext';
import { useAuth } from '../auth/AuthContext';
import { RoundScreenContainer } from '../components/RoundScreenContainer';
import { THEME } from '../styles/theme';

export const QuickActionsScreen: React.FC = () => {
  const {
    connectionStatus,
    startBreak,
    acknowledgeSedentary,
    triggerTestHaptic,
    isDemoMode,
    toggleDemoMode,
    payload,
    simulatePhoneUpdate,
    user,
    stats,
    requestStats,
    requestUserInfo,
  } = useWatch();
  const { signOut } = useAuth();

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 1800);
  };

  const handleStartBreak = async () => {
    await startBreak(5);
    showFeedback('Pausa de 5m iniciada');
  };

  const handleAcknowledge = async () => {
    await acknowledgeSedentary();
    showFeedback('¡Bien hecho! Reiniciado');
  };

  return (
    <RoundScreenContainer>
      <View style={styles.content}>
        {/* Encabezado */}
        <Text style={styles.headerTitle}>ACCIONES RÁPIDAS</Text>

        <View style={styles.userSection}>
          <View style={styles.userRow}>
            <User size={12} color="#94A3B8" />
            <Text style={styles.userText} numberOfLines={1}>
              {user?.displayName || user?.email || (isDemoMode ? 'Demo' : 'Sin sesión')}
            </Text>
          </View>
          {user?.email && user?.displayName && user.displayName !== user.email && (
            <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          )}
        </View>

        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <BarChart3 size={10} color="#34D399" />
              <Text style={styles.statText}>{stats.todayFocusMinutes}m foco</Text>
            </View>
            <Text style={styles.statDivider}>•</Text>
            <Text style={styles.statText}>{stats.todayDistractions} distr.</Text>
          </View>
        )}

        {feedbackMsg ? (
          <View style={styles.feedbackBanner}>
            <Check size={14} color="#10B981" />
            <Text style={styles.feedbackText}>{feedbackMsg}</Text>
          </View>
        ) : (
          <View style={styles.buttonsContainer}>
            {/* Botón 1: Pausa de 5 min */}
            <Pressable
              onPress={() => void handleStartBreak()}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.breakBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Coffee size={14} color="#10B981" />
              <Text style={styles.btnText}>Pausa de 5 min</Text>
            </Pressable>

            {/* Botón 2: Me Levanté */}
            <Pressable
              onPress={() => void handleAcknowledge()}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.sedentaryBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Footprints size={14} color="#38BDF8" />
              <Text style={styles.btnText}>Me Levanté</Text>
            </Pressable>

            {(user || stats) && (
              <Pressable
                onPress={async () => {
                  await requestStats();
                  await requestUserInfo();
                  showFeedback('Sincronizando...');
                }}
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <RotateCcw size={12} color="#94A3B8" />
                <Text style={styles.btnText}>Actualizar</Text>
              </Pressable>
            )}

            <Pressable
              onPress={async () => {
                await signOut();
                showFeedback('Sesión cerrada');
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <LogOut size={12} color="#F87171" />
              <Text style={[styles.btnText, { color: '#F87171' }]}>Cerrar sesión</Text>
            </Pressable>
          </View>
        )}

        {/* Indicador de Enlace Bluetooth y Estado */}
        <View style={styles.statusRow}>
          <Bluetooth
            size={12}
            color={connectionStatus === 'connected' ? '#00E5FF' : '#EF4444'}
          />
          <Text style={styles.statusText}>
            {connectionStatus === 'connected' ? 'Móvil: Conectado' : 'Móvil: Buscando...'}
          </Text>
        </View>

        {/* Mini barra de herramientas para pruebas en reloj / emulador */}
        <View style={styles.toolRow}>
          <Pressable
            onPress={triggerTestHaptic}
            style={({ pressed }) => [styles.miniToolBtn, pressed && styles.btnPressed]}
          >
            <Vibrate size={11} color="#94A3B8" />
            <Text style={styles.miniToolText}>Vibrar</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              simulatePhoneUpdate((prev) => ({
                ...prev,
                ambient: {
                  ...prev.ambient,
                  sedentaryAlert: !prev.ambient.sedentaryAlert,
                  sedentaryMinutes: prev.ambient.sedentaryAlert ? 20 : 65,
                },
              }))
            }
            style={({ pressed }) => [styles.miniToolBtn, pressed && styles.btnPressed]}
          >
            <Sliders size={11} color={payload.ambient.sedentaryAlert ? '#EF4444' : '#94A3B8'} />
            <Text
              style={[
                styles.miniToolText,
                payload.ambient.sedentaryAlert && { color: '#EF4444' },
              ]}
            >
              Sedentario
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              simulatePhoneUpdate((prev) => ({
                ...prev,
                ambient: {
                  ...prev.ambient,
                  noiseDb: prev.ambient.noiseDb >= 70 ? 52 : 76,
                  noiseStatus: prev.ambient.noiseDb >= 70 ? 'optimal' : 'danger',
                },
              }))
            }
            style={({ pressed }) => [styles.miniToolBtn, pressed && styles.btnPressed]}
          >
            <Text style={[styles.miniToolText, payload.ambient.noiseDb >= 70 && { color: '#EF4444' }]}>
              {payload.ambient.noiseDb >= 70 ? '76dB 🚨' : 'Ruido'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              simulatePhoneUpdate((prev) => ({
                ...prev,
                session: {
                  ...prev.session,
                  distractionsCount: prev.session.distractionsCount + 1,
                },
              }))
            }
            style={({ pressed }) => [styles.miniToolBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.miniToolText}>+1 Distr.</Text>
          </Pressable>
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilyBold,
    color: '#00E5FF',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  userSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userText: {
    color: '#E5E7EB',
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilySemiBold,
    maxWidth: 110,
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 8,
    fontFamily: THEME.typography.fontFamilyRegular,
    marginTop: 1,
    maxWidth: 110,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    color: '#CBD5E1',
    fontSize: 9,
    fontFamily: THEME.typography.fontFamilyMedium,
  },
  statDivider: {
    color: '#475569',
    fontSize: 8,
  },
  buttonsContainer: {
    width: '100%',
    gap: 6,
    paddingHorizontal: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  breakBtn: {
    borderColor: '#065F46',
  },
  sedentaryBtn: {
    borderColor: '#0369A1',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: THEME.typography.fontFamilySemiBold,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginVertical: 4,
  },
  feedbackText: {
    color: '#ECFDF5',
    fontSize: 11,
    fontFamily: THEME.typography.fontFamilySemiBold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilyMedium,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  miniToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1E293B',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  miniToolText: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: THEME.typography.fontFamilyRegular,
  },
});
