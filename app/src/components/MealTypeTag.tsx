import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MealType, MEAL_TYPE_LABELS } from '../types';
import { Colors } from './Colors';

const MEAL_COLORS: Record<MealType, { bg: string; text: string }> = {
  breakfast: { bg: Colors.breakfast, text: Colors.breakfastText },
  lunch: { bg: Colors.lunch, text: Colors.lunchText },
  dinner: { bg: Colors.dinner, text: Colors.dinnerText },
};

export function MealTypeTag({ type }: { type: MealType }) {
  const colors = MEAL_COLORS[type];
  return (
    <View style={[styles.tag, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{MEAL_TYPE_LABELS[type]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
