import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors } from './Colors';
import { MealPlan, MealType } from '../types';

interface Props {
  year: number;
  month: number; // 0-indexed
  mealPlans: MealPlan[];
  onDayPress: (date: string) => void;
  onAddMeal: (date: string, mealType: MealType) => void;
}

const MEAL_DOTS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
};

export function CalendarMonthView({ year, month, mealPlans, onDayPress, onAddMeal }: Props) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();

  // 献立をdateでグループ化
  const plansByDate: Record<string, MealPlan[]> = {};
  for (const p of mealPlans) {
    if (!plansByDate[p.date]) plansByDate[p.date] = [];
    plansByDate[p.date].push(p);
  }

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // 6行になるよう末尾埋め
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.dowRow}>
        {DOW_LABELS.map((d, i) => (
          <Text key={i} style={[styles.dowLabel, i === 0 && styles.sun, i === 6 && styles.sat]}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.cell} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const plans = plansByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            return (
              <TouchableOpacity
                key={di}
                style={[styles.cell, isToday && styles.cellToday]}
                onPress={() => onDayPress(dateStr)}
              >
                <Text style={[styles.dayNum, isToday && styles.dayNumToday, di === 0 && styles.sun, di === 6 && styles.sat]}>
                  {day}
                </Text>
                <View style={styles.planList}>
                  {plans.slice(0, 3).map(p => (
                    <Text key={p.id} style={styles.planText} numberOfLines={1}>
                      {MEAL_DOTS[p.meal_type]} {p.dish_name}
                    </Text>
                  ))}
                  {plans.length === 0 && (
                    <TouchableOpacity onPress={() => onAddMeal(dateStr, 'dinner')}>
                      <Text style={styles.addHint}>+ 追加</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dowRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: Colors.border, paddingVertical: 6 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  sun: { color: '#e05' },
  sat: { color: '#05e' },
  weekRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: Colors.border, minHeight: 80 },
  cell: {
    flex: 1, padding: 4, borderRightWidth: 1, borderColor: Colors.border,
  },
  cellToday: { backgroundColor: Colors.accent },
  dayNum: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  dayNumToday: { color: Colors.primary },
  planList: { gap: 2 },
  planText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  addHint: { fontSize: 13, color: Colors.textSecondary },
});
