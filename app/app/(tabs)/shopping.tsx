import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Modal, TextInput, SectionList, useWindowDimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { LoadingView } from '../../src/components/LoadingView';
import { EmptyState } from '../../src/components/EmptyState';
import { useShopping } from '../../src/hooks/useShopping';
import { ShoppingItem } from '../../src/types';

type ViewMode = 'week' | 'day';

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function addWeeks(weekStart: string, n: number): string {
  return addDays(weekStart, n * 7);
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const y = start.getFullYear();
  return `${y}年 ${start.getMonth() + 1}/${start.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
}

export default function ShoppingScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split('T')[0]);

  // 週ビュー時は weekStart、日ビュー時は selectedDay の週の月曜
  const queryWeekStart = viewMode === 'week' ? weekStart : getMondayOfWeek(new Date(selectedDay));

  const { items, loading, reload, generate, addCustom, toggleCheck, updateItem, deleteItem } = useShopping(queryWeekStart);

  // 追加モーダル
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');

  // 編集モーダル
  const [editModal, setEditModal] = useState<ShoppingItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // 7日分の日付リスト（週ビュー用）
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(queryWeekStart, i));

  const handleGenerate = async () => {
    Alert.alert(
      '買い物リスト生成',
      'この週の献立から買い物を自動生成します。\n既存の自動生成項目は置き換えられます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '生成', onPress: async () => {
          try { await generate(); }
          catch (e: any) { Alert.alert('エラー', e.message); }
        }},
      ]
    );
  };

  const handleAddCustom = async () => {
    if (!newName.trim()) return;
    try {
      const [qty, unit] = parseAmount(newAmount);
      await addCustom(newName.trim(), qty, unit, newNote.trim() || undefined);
      setAddModal(false);
      setNewName(''); setNewAmount(''); setNewNote('');
    } catch (e: any) { Alert.alert('エラー', e.message); }
  };

  const openEdit = (item: ShoppingItem) => {
    setEditModal(item);
    setEditName(item.name);
    const amt = item.quantity > 0
      ? (item.unit ? `${item.quantity}${item.unit}` : String(item.quantity))
      : (item.unit || '');
    setEditAmount(amt);
    setEditNote(item.note || '');
  };

  const handleEditSave = async () => {
    if (!editModal || !editName.trim()) return;
    try {
      const [qty, unit] = parseAmount(editAmount);
      await updateItem(editModal.id, {
        name: editName.trim(), quantity: qty, unit, note: editNote.trim() || undefined,
      });
      setEditModal(null);
    } catch (e: any) { Alert.alert('エラー', e.message); }
  };

  const handleDelete = (item: ShoppingItem) => {
    const doDelete = async () => {
      try { await deleteItem(item.id); }
      catch (e: any) { Alert.alert('エラー', e.message); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`「${item.name}」を削除しますか？`)) doDelete();
    } else {
      Alert.alert('削除', `「${item.name}」を削除しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // 日ビュー時は selectedDay に該当する項目のみ（全期間分は週単位なのでフィルタなし実質全件）
  const displayItems = items;

  const unchecked = displayItems.filter(i => !i.checked);
  const checked = displayItems.filter(i => i.checked);

  const sections = [
    ...(unchecked.length > 0 ? [{ title: `未購入 (${unchecked.length})`, data: unchecked }] : []),
    ...(checked.length > 0 ? [{ title: `購入済み (${checked.length})`, data: checked }] : []),
  ];

  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const amtStr = item.quantity > 0
      ? (item.unit ? `${item.quantity}${item.unit}` : String(item.quantity))
      : (item.unit || '');
    return (
      <View style={[styles.item, !!item.checked && styles.itemChecked]}>
        {/* チェックボックスのみタップでトグル */}
        <TouchableOpacity style={styles.checkboxWrap} onPress={() => toggleCheck(item.id)}>
          <View style={[styles.checkbox, !!item.checked && styles.checkboxChecked]}>
            {item.checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
        </TouchableOpacity>
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, !!item.checked && styles.itemNameChecked]}>{item.name}</Text>
          {(amtStr || item.note) ? (
            <Text style={styles.itemSub}>
              {amtStr}{amtStr && item.note ? '  ' : ''}{item.note || ''}
            </Text>
          ) : null}
        </View>
        {item.custom || item.auto ? (
          <View style={[styles.badge, item.auto && styles.badgeAuto]}>
            <Text style={styles.badgeText}>{item.auto ? '献立' : '追加'}</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
          <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={15} color={Colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        {/* ツールバー */}
        <View style={styles.toolbar}>
          {/* 週/日ビュー切替 */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, viewMode === 'week' && styles.modeTabActive]}
              onPress={() => setViewMode('week')}
            >
              <Text style={[styles.modeTabText, viewMode === 'week' && styles.modeTabTextActive]}>週</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, viewMode === 'day' && styles.modeTabActive]}
              onPress={() => setViewMode('day')}
            >
              <Text style={[styles.modeTabText, viewMode === 'day' && styles.modeTabTextActive]}>日</Text>
            </TouchableOpacity>
          </View>

          {/* ナビゲーション */}
          {viewMode === 'week' ? (
            <>
              <TouchableOpacity style={styles.navBtn} onPress={() => setWeekStart(w => addWeeks(w, -1))}>
                <Ionicons name="chevron-back" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setWeekStart(getMondayOfWeek(new Date()))} style={{ flex: 1 }}>
                <Text style={styles.periodLabel}>{formatWeekLabel(weekStart)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => setWeekStart(w => addWeeks(w, 1))}>
                <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.navBtn} onPress={() => setSelectedDay(d => addDays(d, -1))}>
                <Ionicons name="chevron-back" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedDay(new Date().toISOString().split('T')[0])}
                style={{ flex: 1 }}
              >
                <Text style={styles.periodLabel}>{formatDayLabel(selectedDay)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => setSelectedDay(d => addDays(d, 1))}>
                <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 日ビュー: 7日分の選択タブ */}
        {viewMode === 'day' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabBar} contentContainerStyle={styles.dayTabContent}>
            {weekDays.map(day => {
              const d = new Date(day);
              const DOW = ['日', '月', '火', '水', '木', '金', '土'];
              const isSelected = day === selectedDay;
              const isToday = day === new Date().toISOString().split('T')[0];
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayTab, isSelected && styles.dayTabSelected]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayTabDow, isSelected && styles.dayTabTextSelected, isToday && !isSelected && styles.dayTabToday]}>
                    {DOW[d.getDay()]}
                  </Text>
                  <Text style={[styles.dayTabDate, isSelected && styles.dayTabTextSelected]}>
                    {d.getMonth() + 1}/{d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* アクションボタン */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
            <Ionicons name="refresh-outline" size={16} color={Colors.background} />
            <Text style={styles.generateBtnText}>献立から生成</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.customAddBtn} onPress={() => setAddModal(true)}>
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.customAddBtnText}>手動追加</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listPanel}>
          {loading ? (
            <LoadingView />
          ) : displayItems.length === 0 ? (
            <EmptyState
              title="買い物リストが空です"
              subtitle="「献立から生成」を押すか、手動で項目を追加してください"
            />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
              )}
              contentContainerStyle={styles.list}
              stickySectionHeadersEnabled={false}
            />
          )}
        </View>
      </View>

      {/* 編集モーダル */}
      <Modal visible={!!editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitle}>項目を編集</Text>
              <TouchableOpacity onPress={() => setEditModal(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>食材名 *</Text>
            <TextInput
              style={styles.modalInput} placeholder="例: 鶏もも肉"
              value={editName} onChangeText={setEditName}
              placeholderTextColor={Colors.textSecondary} autoFocus
            />
            <Text style={styles.modalLabel}>数量・単位</Text>
            <TextInput
              style={styles.modalInput} placeholder="例: 300g, 2個, 1パック"
              value={editAmount} onChangeText={setEditAmount}
              placeholderTextColor={Colors.textSecondary}
            />
            <Text style={styles.modalLabel}>追加メモ (任意)</Text>
            <TextInput
              style={styles.modalInput} placeholder="例: 国産、特売のもの"
              value={editNote} onChangeText={setEditNote}
              placeholderTextColor={Colors.textSecondary}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModal(null)}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, !editName.trim() && styles.disabled]}
                onPress={handleEditSave} disabled={!editName.trim()}
              >
                <Text style={styles.modalSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 追加モーダル */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitle}>項目を追加</Text>
              <TouchableOpacity onPress={() => setAddModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>食材名 *</Text>
            <TextInput
              style={styles.modalInput} placeholder="例: 鶏もも肉"
              value={newName} onChangeText={setNewName}
              placeholderTextColor={Colors.textSecondary} autoFocus
            />
            <Text style={styles.modalLabel}>数量・単位</Text>
            <TextInput
              style={styles.modalInput} placeholder="例: 300g, 2個, 1パック"
              value={newAmount} onChangeText={setNewAmount}
              placeholderTextColor={Colors.textSecondary}
            />
            <Text style={styles.modalLabel}>追加メモ (任意)</Text>
            <TextInput
              style={styles.modalInput} placeholder="例: 国産、特売のもの"
              value={newNote} onChangeText={setNewNote}
              placeholderTextColor={Colors.textSecondary}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, !newName.trim() && styles.disabled]}
                onPress={handleAddCustom} disabled={!newName.trim()}
              >
                <Text style={styles.modalSaveText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// "300g" → [300, "g"],  "2個" → [2, "個"],  "適量" → [0, "適量"]
function parseAmount(str: string): [number, string] {
  if (!str.trim()) return [0, ''];
  const m = str.trim().match(/^([\d.]+)\s*(.*)$/);
  if (m) return [parseFloat(m[1]) || 0, m[2].trim()];
  return [0, str.trim()];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  page: { flex: 1, width: '100%', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  pageDesktop: { maxWidth: 980, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 20 },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  modeTabs: {
    flexDirection: 'row', borderRadius: 6, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  modeTab: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.background },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  modeTabTextActive: { color: '#fff' },
  navBtn: { padding: 6 },
  periodLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  dayTabBar: { maxHeight: 60, marginTop: 8 },
  dayTabContent: { gap: 6, paddingVertical: 4 },
  dayTab: {
    width: 48, alignItems: 'center', paddingVertical: 6, borderRadius: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  dayTabSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayTabDow: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  dayTabDate: { fontSize: 12, fontWeight: '600', color: Colors.text },
  dayTabTextSelected: { color: '#fff' },
  dayTabToday: { color: Colors.primary },
  actions: {
    flexDirection: 'row', gap: 8, marginTop: 8,
  },
  generateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, padding: 10, borderRadius: 8, minHeight: 44,
  },
  generateBtnText: { color: Colors.background, fontWeight: '700', fontSize: 14 },
  customAddBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.surface, padding: 10, borderRadius: 8, minHeight: 44,
    borderWidth: 1, borderColor: Colors.primary,
  },
  customAddBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  listPanel: { flex: 1, minHeight: 0, marginTop: 8 },
  list: { paddingBottom: 20 },
  sectionHeader: { paddingVertical: 6, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 10, paddingLeft: 12, paddingRight: 6,
    marginBottom: 6, gap: 8,
  },
  itemChecked: { opacity: 0.5 },
  checkboxWrap: { padding: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  itemContent: { flex: 1 },
  itemName: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  itemNameChecked: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  itemSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badge: {
    backgroundColor: Colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, borderWidth: 1, borderColor: Colors.primary,
  },
  badgeAuto: { backgroundColor: Colors.background, borderColor: Colors.border },
  badgeText: { fontSize: 11, color: Colors.primaryDark, fontWeight: '600' },
  actionBtn: { padding: 8 },
  // モーダル
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 40,
  },
  modalCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalCardTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalCloseBtn: { padding: 4 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: 12, textTransform: 'uppercase' },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, fontSize: 15, color: Colors.text,
  },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 16 },
  modalCancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: 12, minHeight: 44, borderRadius: 8,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  modalSaveBtn: {
    flex: 1, padding: 12, minHeight: 44, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary,
  },
  modalSaveText: { color: Colors.background, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.4 },
});
