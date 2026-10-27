/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { WatchProvider } from './src/context/WatchContext';
import { FocusScreen } from './src/screens/FocusScreen';
import { AmbientScreen } from './src/screens/AmbientScreen';
import { QuickActionsScreen } from './src/screens/QuickActionsScreen';
import { PagerIndicator } from './src/components/PagerIndicator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentPage && page >= 0 && page <= 2) {
      setCurrentPage(page);
    }
  };

  return (
    <WatchProvider>
      <View style={styles.container}>
        {/* Reloj inteligente en modo inmersivo con barra de estado oculta */}
        <StatusBar hidden />

        {/* Swipe Pager Horizontal de 3 Pantallas */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.pager}
        >
          {/* Pantalla 1: Enfoque / Pomodoro (Home) */}
          <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
            <FocusScreen />
          </View>

          {/* Pantalla 2: Semáforo Ambiental (Ergonomía) */}
          <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
            <AmbientScreen />
          </View>

          {/* Pantalla 3: Acciones Rápidas y Conectividad */}
          <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
            <QuickActionsScreen />
          </View>
        </ScrollView>

        {/* Indicador de 3 puntos en la parte inferior */}
        <PagerIndicator totalPages={3} currentPage={currentPage} />
      </View>
    </WatchProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pager: {
    flex: 1,
  },
});
