import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Modal,
  FlatList, TextInput, useWindowDimensions, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { CalendarWeekView } from '../../src/components/CalendarWeekView';
import { CalendarMonthView } from '../../src/components/CalendarMonthView';
import { LoadingView } from '../../src/components/LoadingView';
import { useMealPlans } from '../../src/hooks/useMealPlans';
import { useDishes } from '../../src/hooks/useDishes';
import { MealPlan, MealType, Todo, MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../../src/types';
import { MealTypeTag } from '../../src/components/MealTypeTag';
import { todosApi } from '../../src/api/client';

type ViewMode = 'week' | 'month';

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // TODO state (for week/month display only)
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todosLoading, setTodosLoading] = useState(false);

  // 週次
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const weekEnd = addDays(weekStart, 6);

  // 月次
  const today = new Date();
  const [monthYear, setMonthYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());

  // 月次の from/to
  const monthFrom = `${monthYear}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDayOfMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
  const monthTo = `${monthYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const from = viewMode === 'week' ? formatDate(weekStart) : monthFrom;
  const to = viewMode === 'week' ? formatDate(weekEnd) : monthTo;

  const { mealPlans, loading, reload, addMealPlan, removeMealPlan } = useMealPlans(from, to);
  const { dishes } = useDishes();

  const [addModal, setAddModal] = useState<{ date: string; mealType: MealType } | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string>('');
  const [dishSearch, setDishSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [detailModal, setDetailModal] = useState<MealPlan | null>(null);
  // 日付タップモーダル
  const [dayModal, setDayModal] = useState<string | null>(null);

  const reloadTodos = useCallback(async () => {
    setTodosLoading(true);
    try { setTodos(await todosApi.list()); } catch {}
    finally { setTodosLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    reload();
    reloadTodos();
  }, [reload, reloadTodos]));

  const handleAddMeal = (date: string, mealType: MealType) => {
    setSelectedDishId('');
    setDishSearch('');
    setSelectedTag('');
    setAddModal({ date, mealType });
  };

  const confirmAddMeal = async () => {
    if (!addModal || !selectedDishId) return;
    try {
      await addMealPlan(addModal.date, addModal.mealType, selectedDishId);
      setAddModal(null);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    }
  };

  const handleMealPress = (plan: MealPlan) => setDetailModal(plan);

  const handleDeleteMeal = async () => {
    if (!detailModal) return;
    Alert.alert('削除確認', `「${detailModal.dish_name}」を献立から削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          try {
            await removeMealPlan(detailModal.id);
            setDetailModal(null);
          } catch (e: any) {
            Alert.alert('エラー', e.message);
          }
        },
      },
    ]);
  };

  const allTags = [...new Set(dishes.flatMap(d => d.tags || []))].sort();

  const filteredDishes = dishes.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(dishSearch.toLowerCase());
    const matchTag = !selectedTag || (d.tags || []).includes(selectedTag);
    return matchSearch && matchTag;
  });

  const weekLabel = weekStart.getFullYear() === weekEnd.getFullYear()
    ? `${weekStart.getFullYear()}年 ${weekStart.getMonth() + 1}/${weekStart.getDate()} 〜 ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
    : `${weekStart.getFullYear()}/${weekStart.getMonth() + 1}/${weekStart.getDate()} 〜 ${weekEnd.getFullYear()}/${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
  const monthLabel = `${monthYear}年${monthIndex + 1}月`;

  const prevPeriod = () => {
    if (viewMode === 'week') {
      setWeekStart(prev => addDays(prev, -7));
    } else {
      if (monthIndex === 0) { setMonthIndex(11); setMonthYear(y => y - 1); }
      else setMonthIndex(m => m - 1);
    }
  };
  const nextPeriod = () => {
    if (viewMode === 'week') {
      setWeekStart(prev => addDays(prev, 7));
    } else {
      if (monthIndex === 11) { setMonthIndex(0); setMonthYear(y => y + 1); }
      else setMonthIndex(m => m + 1);
    }
  };
  const goToToday = () => {
    setWeekStart(getMondayOfWeek(new Date()));
    setMonthYear(today.getFullYear());
    setMonthIndex(today.getMonth());
  };

  return (
    <View style={styles.container}>
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>

        {/* Calendar view mode toggle */}
        <View style={styles.toolbar}>
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, viewMode === 'week' && styles.modeTabActive]}
              onPress={() => setViewMode('week')}
            >
              <Text style={[styles.modeTabText, viewMode === 'week' && styles.modeTabTextActive]}>週</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, viewMode === 'month' && styles.modeTabActive]}
              onPress={() => setViewMode('month')}
            >
              <Text style={[styles.modeTabText, viewMode === 'month' && styles.modeTabTextActive]}>月</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.navBtn} onPress={prevPeriod}>
            <Text style={styles.navBtnText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.periodLabel}>{viewMode === 'week' ? weekLabel : monthLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={nextPeriod}>
            <Text style={styles.navBtnText}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarPanel}>
          {loading ? (
            <LoadingView />
          ) : viewMode === 'week' ? (
            <CalendarWeekView
              weekStart={weekStart}
              mealPlans={mealPlans}
              todos={todos}
              onDayPress={(date) => setDayModal(date)}
              onMealPress={handleMealPress}
              onAddMeal={handleAddMeal}
            />
          ) : (
            <CalendarMonthView
              year={monthYear}
              month={monthIndex}
              mealPlans={mealPlans}
              todos={todos}
              onDayPress={(date) => setDayModal(date)}
              onAddMeal={handleAddMeal}
            />
          )}
        </View>
      </View>

      {/* Add Meal Modal */}
      <Modal visible={!!addModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setAddModal(null)}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {addModal && `${addModal.date} ${MEAL_TYPE_LABELS[addModal.mealType]}`}
            </Text>
            <TouchableOpacity onPress={confirmAddMeal} disabled={!selectedDishId}>
              <Text style={[styles.modalDone, !selectedDishId && styles.disabled]}>追加</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="料理を検索..."
            value={dishSearch}
            onChangeText={setDishSearch}
            placeholderTextColor={Colors.textSecondary}
          />

          {allTags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagFilterBar} contentContainerStyle={styles.tagFilterContent}>
              <TouchableOpacity
                style={[styles.tagFilterChip, !selectedTag && styles.tagFilterChipActive]}
                onPress={() => setSelectedTag('')}
              >
                <Text style={[styles.tagFilterText, !selectedTag && styles.tagFilterTextActive]}>すべて</Text>
              </TouchableOpacity>
              {allTags.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagFilterChip, selectedTag === tag && styles.tagFilterChipActive]}
                  onPress={() => setSelectedTag(prev => prev === tag ? '' : tag)}
                >
                  <Text style={[styles.tagFilterText, selectedTag === tag && styles.tagFilterTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <FlatList
            data={filteredDishes}
            keyExtractor={d => d.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.dishItem, selectedDishId === item.id && styles.dishItemSelected]}
                onPress={() => setSelectedDishId(item.id)}
              >
                {item.image_data ? (
                  <Image source={{ uri: item.image_data }} style={styles.dishItemImage} resizeMode="cover" />
                ) : (
                  <View style={styles.dishItemImagePlaceholder} />
                )}
                <View style={styles.dishItemBody}>
                  <Text style={styles.dishItemName}>{item.name}</Text>
                  {(item.tags || []).length > 0 && (
                    <View style={styles.dishItemTags}>
                      {item.tags.slice(0, 3).map(tag => (
                        <View key={tag} style={styles.dishItemTag}>
                          <Text style={styles.dishItemTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                {selectedDishId === item.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {dishes.length === 0 ? '料理を先に登録してください' : '該当なし'}
              </Text>
            }
          />
        </View>
      </Modal>

      {/* Day Modal */}
      <Modal visible={!!dayModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDayModal(null)}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
              <Text style={styles.modalCancel}>閉じる</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{dayModal}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalBody}>
            {MEAL_TYPE_ORDER.map(mealType => {
              const plan = dayModal ? mealPlans.find(p => p.date === dayModal && p.meal_type === mealType) : undefined;
              return (
                <View key={mealType} style={styles.dayModalSlot}>
                  <Text style={styles.dayModalMealType}>{MEAL_TYPE_LABELS[mealType]}</Text>
                  {plan ? (
                    <View style={styles.dayModalPlanRow}>
                      <Text style={styles.dayModalDishName}>{plan.dish_name}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('削除確認', `「${plan.dish_name}」を削除しますか？`, [
                            { text: 'キャンセル', style: 'cancel' },
                            { text: '削除', style: 'destructive', onPress: async () => {
                              try { await removeMealPlan(plan.id); } catch (e: any) { Alert.alert('エラー', e.message); }
                            }},
                          ]);
                        }}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      >
                        <Text style={styles.dayModalDelete}>削除</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.dayModalAdd}
                      onPress={() => { setDayModal(null); dayModal && handleAddMeal(dayModal, mealType); }}
                    >
                      <Text style={styles.dayModalAddText}>+ 追加</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Meal Detail Modal */}
      <Modal visible={!!detailModal} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDetailModal(null)}>
          <TouchableOpacity style={styles.detailCard} activeOpacity={1} onPress={() => {}}>
            {detailModal && (
              <>
                <MealTypeTag type={detailModal.meal_type} />
                <Text style={styles.detailTitle}>{detailModal.dish_name}</Text>
                <Text style={styles.detailDate}>{detailModal.date}</Text>
                {detailModal.recipe_url && (
                  <Text style={styles.detailUrl} numberOfLines={2}>{detailModal.recipe_url}</Text>
                )}
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteMeal}>
                  <Text style={styles.deleteBtnText}>献立から削除</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  page: { flex: 1, width: '100%', alignSelf: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  pageDesktop: { maxWidth: 1280, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    gap: 8,
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 4,
  },
  modeTab: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.background },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modeTabTextActive: { color: '#fff' },
  navBtn: { padding: 8 },
  navBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  periodLabel: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1, textAlign: 'center' },
  calendarPanel: { flex: 1, minHeight: 0, marginTop: 8 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 80 },
  modalCancel: { fontSize: 14, color: Colors.textSecondary },
  modalDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  modalBody: { padding: 16 },
  disabled: { opacity: 0.4 },
  searchInput: {
    margin: 12, padding: 12, minHeight: 44, backgroundColor: Colors.surface,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    fontSize: 16, color: Colors.text,
  },
  tagFilterBar: { maxHeight: 44, marginHorizontal: 12, marginBottom: 4 },
  tagFilterContent: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  tagFilterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  tagFilterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  tagFilterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  tagFilterTextActive: { color: Colors.primaryDark },
  dishItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    marginHorizontal: 12, marginBottom: 6, padding: 10,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  dishItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  dishItemImage: { width: 52, height: 52, borderRadius: 6 },
  dishItemImagePlaceholder: { width: 52, height: 52, borderRadius: 6, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  dishItemBody: { flex: 1, gap: 4 },
  dishItemName: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  dishItemTags: { flexDirection: 'row', gap: 4 },
  dishItemTag: { backgroundColor: Colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  dishItemTagText: { fontSize: 11, color: Colors.textSecondary },
  checkmark: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, padding: 32, fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  detailCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 24, width: '80%', maxWidth: 360,
  },
  detailTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 8 },
  detailDate: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  detailUrl: { fontSize: 13, color: Colors.primary, marginTop: 8 },
  deleteBtn: { marginTop: 20, backgroundColor: Colors.accent, padding: 12, borderRadius: 8, alignItems: 'center' },
  deleteBtnText: { color: Colors.primaryDark, fontWeight: '600', fontSize: 16 },
  dayModalSlot: {
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dayModalMealType: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  dayModalPlanRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayModalDishName: { fontSize: 16, color: Colors.text, fontWeight: '600', flex: 1 },
  dayModalDelete: { fontSize: 14, color: Colors.error, fontWeight: '700', marginLeft: 12 },
  dayModalAdd: {
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  dayModalAddText: { fontSize: 14, color: Colors.textSecondary },
});
