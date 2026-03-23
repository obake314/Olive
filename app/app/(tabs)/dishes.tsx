import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, Modal, TextInput, ScrollView, Linking
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { LoadingView } from '../../src/components/LoadingView';
import { EmptyState } from '../../src/components/EmptyState';
import { useDishes } from '../../src/hooks/useDishes';
import { Dish, Ingredient } from '../../src/types';

interface IngredientInput {
  name: string;
  quantity: string;
  unit: string;
}

const EMPTY_INGREDIENT: IngredientInput = { name: '', quantity: '', unit: '' };

export default function DishesScreen() {
  const { dishes, loading, reload, createDish, updateDish, deleteDish } = useDishes();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [name, setName] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [ingredients, setIngredients] = useState<IngredientInput[]>([{ ...EMPTY_INGREDIENT }]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openAdd = () => {
    setEditingDish(null);
    setName('');
    setRecipeUrl('');
    setIngredients([{ ...EMPTY_INGREDIENT }]);
    setModalVisible(true);
  };

  const openEdit = (dish: Dish) => {
    setEditingDish(dish);
    setName(dish.name);
    setRecipeUrl(dish.recipe_url || '');
    setIngredients(
      dish.ingredients.length > 0
        ? dish.ingredients.map(i => ({ name: i.name, quantity: String(i.quantity), unit: i.unit }))
        : [{ ...EMPTY_INGREDIENT }]
    );
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('エラー', '料理名を入力してください'); return; }
    setSaving(true);
    try {
      const ingredientData = ingredients
        .filter(i => i.name.trim())
        .map(i => ({ name: i.name.trim(), quantity: parseFloat(i.quantity) || 0, unit: i.unit.trim() }));

      if (editingDish) {
        await updateDish(editingDish.id, {
          name: name.trim(),
          recipe_url: recipeUrl.trim() || undefined,
          ingredients: ingredientData,
        });
      } else {
        await createDish({
          name: name.trim(),
          recipe_url: recipeUrl.trim() || undefined,
          ingredients: ingredientData,
        });
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (dish: Dish) => {
    Alert.alert('削除確認', `「${dish.name}」を削除しますか？\n紐づく献立も削除されます。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try { await deleteDish(dish.id); }
          catch (e: any) { Alert.alert('エラー', e.message); }
        },
      },
    ]);
  };

  const updateIngredient = (idx: number, field: keyof IngredientInput, value: string) => {
    setIngredients(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addIngredientRow = () => setIngredients(prev => [...prev, { ...EMPTY_INGREDIENT }]);
  const removeIngredientRow = (idx: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const filtered = dishes.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="料理を検索..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={Colors.textSecondary}
        />
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ 追加</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingView />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🍳" title="料理がありません" subtitle="「+ 追加」ボタンから料理を登録しましょう" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={d => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{item.name}</Text>
                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Text style={styles.deleteIcon}>🗑</Text>
                </TouchableOpacity>
              </View>

              {item.ingredients.length > 0 && (
                <View style={styles.ingredientList}>
                  {item.ingredients.slice(0, 4).map((ing, i) => (
                    <View key={ing.id} style={styles.ingredientChip}>
                      <Text style={styles.ingredientText}>
                        {ing.name}{ing.quantity > 0 ? ` ${ing.quantity}${ing.unit}` : ''}
                      </Text>
                    </View>
                  ))}
                  {item.ingredients.length > 4 && (
                    <View style={styles.ingredientChip}>
                      <Text style={styles.ingredientText}>+{item.ingredients.length - 4}</Text>
                    </View>
                  )}
                </View>
              )}

              {item.recipe_url ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.recipe_url!)}>
                  <Text style={styles.recipeUrl} numberOfLines={1}>🔗 {item.recipe_url}</Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingDish ? '料理を編集' : '料理を追加'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalDone, saving && styles.disabled]}>
                {saving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>料理名 *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例: 肉じゃが"
              placeholderTextColor={Colors.textSecondary}
            />

            <Text style={styles.label}>レシピURL</Text>
            <TextInput
              style={styles.input}
              value={recipeUrl}
              onChangeText={setRecipeUrl}
              placeholder="https://..."
              keyboardType="url"
              autoCapitalize="none"
              placeholderTextColor={Colors.textSecondary}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.label}>材料</Text>
              <TouchableOpacity onPress={addIngredientRow} style={styles.addIngredientBtn}>
                <Text style={styles.addIngredientBtnText}>+ 追加</Text>
              </TouchableOpacity>
            </View>

            {ingredients.map((ing, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <TextInput
                  style={[styles.input, styles.ingredientName]}
                  value={ing.name}
                  onChangeText={v => updateIngredient(idx, 'name', v)}
                  placeholder="材料名"
                  placeholderTextColor={Colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, styles.ingredientQty]}
                  value={ing.quantity}
                  onChangeText={v => updateIngredient(idx, 'quantity', v)}
                  placeholder="数量"
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, styles.ingredientUnit]}
                  value={ing.unit}
                  onChangeText={v => updateIngredient(idx, 'unit', v)}
                  placeholder="単位"
                  placeholderTextColor={Colors.textSecondary}
                />
                {ingredients.length > 1 && (
                  <TouchableOpacity onPress={() => removeIngredientRow(idx)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 12, gap: 8 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  deleteIcon: { fontSize: 16 },
  ingredientList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  ingredientChip: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ingredientText: { fontSize: 12, color: Colors.textSecondary },
  recipeUrl: { fontSize: 12, color: Colors.primary, marginTop: 8 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  modalCancel: { fontSize: 15, color: Colors.textSecondary },
  modalDone: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  disabled: { opacity: 0.4 },
  modalBody: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  addIngredientBtn: { padding: 4 },
  addIngredientBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  ingredientRow: { flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' },
  ingredientName: { flex: 3, margin: 0 },
  ingredientQty: { flex: 1.5, margin: 0 },
  ingredientUnit: { flex: 1.5, margin: 0 },
  removeBtn: { padding: 8 },
  removeBtnText: { color: Colors.error, fontSize: 14, fontWeight: '600' },
});
