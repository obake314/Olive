import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, Modal, TextInput, SectionList
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { LoadingView } from '../../src/components/LoadingView';
import { EmptyState } from '../../src/components/EmptyState';
import { useShopping } from '../../src/hooks/useShopping';
import { ShoppingItem } from '../../src/types';

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function addWeeks(weekStart: string, n: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${start.getMonth() + 1}/${start.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}`;
}

export default function ShoppingScreen() {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const { items, loading, reload, generate, addCustom, toggleCheck, deleteItem } = useShopping(weekStart);
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('');

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const handleGenerate = async () => {
    Alert.alert(
      '買い物リスト生成',
      'この週の献立から買い物リストを自動生成します。\n既存の自動生成アイテムは置き換えられます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '生成',
          onPress: async () => {
            try { await generate(); }
            catch (e: any) { Alert.alert('エラー', e.message); }
          },
        },
      ]
    );
  };

  const handleAddCustom = async () => {
    if (!newName.trim()) return;
    try {
      await addCustom(newName.trim(), parseFloat(newQty) || undefined, newUnit.trim() || undefined);
      setAddModal(false);
      setNewName('');
      setNewQty('');
      setNewUnit('');
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    }
  };

  const handleDelete = (item: ShoppingItem) => {
    if (item.auto) {
      Alert.alert('確認', '自動生成アイテムは献立から生成されます。\n削除するには献立を変更してください。');
      return;
    }
    Alert.alert('削除', `「${item.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try { await deleteItem(item.id); }
          catch (e: any) { Alert.alert('エラー', e.message); }
        },
      },
    ]);
  };

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  const sections = [
    ...(unchecked.length > 0 ? [{ title: `未購入 (${unchecked.length})`, data: unchecked }] : []),
    ...(checked.length > 0 ? [{ title: `購入済み (${checked.length})`, data: checked }] : []),
  ];

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <TouchableOpacity
      style={[styles.item, item.checked && styles.itemChecked]}
      onPress={() => toggleCheck(item.id)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
        {item.checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
          {item.name}
        </Text>
        {(item.quantity > 0 || item.unit) && (
          <Text style={styles.itemQty}>
            {item.quantity > 0 ? item.quantity : ''} {item.unit}
          </Text>
        )}
      </View>
      {item.custom ? (
        <View style={styles.customBadge}><Text style={styles.customBadgeText}>追加</Text></View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setWeekStart(w => addWeeks(w, -1))}>
          <Text style={styles.navBtnText}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setWeekStart(getMondayOfWeek(new Date()))}>
          <Text style={styles.weekLabel}>{formatWeekLabel(weekStart)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setWeekStart(w => addWeeks(w, 1))}>
          <Text style={styles.navBtnText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
          <Text style={styles.generateBtnText}>🔄 献立から生成</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.customAddBtn} onPress={() => setAddModal(true)}>
          <Text style={styles.customAddBtnText}>+ カスタム追加</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingView />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="買い物リストが空です"
          subtitle="「献立から生成」を押すか、手動でアイテムを追加してください"
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

      {/* Add Custom Item Modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModalCard}>
            <Text style={styles.addModalTitle}>アイテムを追加</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="食材名 *"
              value={newName}
              onChangeText={setNewName}
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />
            <View style={styles.qtyRow}>
              <TextInput
                style={[styles.modalInput, styles.qtyInput]}
                placeholder="数量"
                value={newQty}
                onChangeText={setNewQty}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textSecondary}
              />
              <TextInput
                style={[styles.modalInput, styles.unitInput]}
                placeholder="単位"
                value={newUnit}
                onChangeText={setNewUnit}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddModal(false)}>
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, !newName.trim() && styles.disabled]}
                onPress={handleAddCustom}
                disabled={!newName.trim()}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navBtn: { padding: 8 },
  navBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  weekLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  actions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  generateBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  customAddBtn: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  customAddBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  list: { padding: 12 },
  sectionHeader: { paddingVertical: 8, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  itemChecked: { opacity: 0.5 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemName: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  itemNameChecked: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  itemQty: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  customBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  customBadgeText: { fontSize: 11, color: Colors.primaryDark, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  addModalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  addModalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 10,
  },
  qtyRow: { flexDirection: 'row', gap: 8 },
  qtyInput: { flex: 1, marginBottom: 10 },
  unitInput: { flex: 1, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '600' },
  modalSaveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  modalSaveText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
