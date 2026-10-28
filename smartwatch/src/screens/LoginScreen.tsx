/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, UserPlus } from 'lucide-react-native';
import { useAuth } from '../auth/AuthContext';
import { RoundScreenContainer } from '../components/RoundScreenContainer';
import { THEME } from '../styles/theme';

export const LoginScreen: React.FC = () => {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage('Ingresa email y contraseña');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      if (mode === 'login') {
        const res = await signIn(email.trim(), password);
        if (!res.ok) setMessage(res.error || 'Error al iniciar sesión');
      } else {
        const res = await signUp(email.trim(), password);
        if (!res.ok) setMessage(res.error || 'Error al registrarse');
        else if (res.confirmationRequired) setMessage('Revisa tu correo para confirmar la cuenta');
        else setMessage('Cuenta creada correctamente');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoundScreenContainer>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.title}>ERGOFOCUS</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </Text>

          {!isConfigured && (
            <Text style={styles.warning}>
              Supabase no configurado. Configura las variables de entorno.
            </Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#475569"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#475569"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          {message && <Text style={styles.message}>{message}</Text>}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !isConfigured}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                {mode === 'login' ? <LogIn size={14} color="#fff" /> : <UserPlus size={14} color="#fff" />}
                <Text style={styles.buttonText}>
                  {mode === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setMessage(null);
            }}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </RoundScreenContainer>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: THEME.typography.fontFamilyBold,
    letterSpacing: 2,
    marginBottom: 2,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: THEME.typography.fontFamilyMedium,
    marginBottom: 8,
  },
  warning: {
    color: '#F59E0B',
    fontSize: 8,
    fontFamily: THEME.typography.fontFamilyRegular,
    textAlign: 'center',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilyRegular,
  },
  message: {
    color: '#94A3B8',
    fontSize: 8,
    fontFamily: THEME.typography.fontFamilyRegular,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: THEME.typography.fontFamilySemiBold,
  },
  switchButton: {
    marginTop: 4,
  },
  switchText: {
    color: '#60A5FA',
    fontSize: 9,
    fontFamily: THEME.typography.fontFamilyMedium,
  },
});
