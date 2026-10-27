/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { THEME } from '../styles/theme';

interface RoundScreenContainerProps {
  children: React.ReactNode;
}

const { width, height } = Dimensions.get('window');
const diameter = Math.min(width, height);

export const RoundScreenContainer: React.FC<RoundScreenContainerProps> = ({ children }) => {
  return (
    <View style={styles.outerContainer}>
      {/* Contenedor circular con padding radial ergonómico */}
      <View style={styles.circularContent}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: width,
    height: height,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularContent: {
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THEME.dimensions.circularPadding,
    paddingVertical: THEME.dimensions.circularPadding - 8,
  },
});
