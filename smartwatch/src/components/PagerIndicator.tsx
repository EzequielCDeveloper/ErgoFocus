/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { THEME } from '../styles/theme';

interface PagerIndicatorProps {
  totalPages: number;
  currentPage: number;
}

export const PagerIndicator: React.FC<PagerIndicatorProps> = ({
  totalPages,
  currentPage,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalPages }).map((_, index) => {
        const isActive = index === currentPage;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              isActive ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  activeDot: {
    width: 14,
    backgroundColor: THEME.colors.primary,
  },
  inactiveDot: {
    width: 5,
    backgroundColor: '#374151',
  },
});
