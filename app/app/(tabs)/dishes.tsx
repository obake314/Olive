import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, Modal, TextInput, ScrollView, Linking, useWindowDimensions, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { LoadingView } from '../../src/components/LoadingView';
import { EmptyState } from '../../src/components/EmptyState';
import { useDishes } from '../../src/hooks/useDishes';
import { recipeApi, dishesApi } from '../../src/api/client';
import { Dish } from '../../src/types';

interface IngredientInput {
  name: string;
  quantity: string;
  unit: string;
}

const EMPTY_INGREDIENT: IngredientInput = { name: '', quantity: '', unit: '' };

async function pickAndCompressImage(): Promise<string | undefined> {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラロールへのアクセス権限が必要です');
      return undefined;
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return undefined;
  const asset = result.assets[0];

  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 800 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return manipulated.base64 ? `data:image/jpeg;base64,${manipulated.base64}` : undefined;
}

export default function DishesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isWideDesktop = width >= 1200;
  const { dishes, loading, reload, createDish, updateDish, deleteDish } = useDishes();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [name, setName] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [recipeText, setRecipeText] = useState('');
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([{ ...EMPTY_INGREDIENT }]);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openAdd = () => {
    setEditingDish(null);
    setName('');
    setRecipeUrl('');
    setRecipeText('');
    setImageData(undefined);
    setIngredients([{ ...EMPTY_INGREDIENT }]);
    setModalVisible(true);
  };

  const openEdit = (dish: Dish) => {
    setEditingDish(dish);
    setName(dish.name);
    setRecipeUrl(dish.recipe_url || '');
    setRecipeText(dish.recipe_text || '');
    setImageData(dish.image_data || undefined);
    setIngredients(
      dish.ingredients.length > 0
        ? dish.ingredients.map(i => ({ name: i.name, quantity: String(i.quantity || ''), unit: i.unit }))
        : [{ ...EMPTY_INGREDIENT }]
    );
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    const data = await pickAndCompressImage();
    if (data) setImageData(data ?? undefined);
  };

  const handleExtract = async () => {
    if (!recipeUrl.trim()) { Alert.alert('エラー', 'レシピURLを入力してください'); return; }
    setExtracting(true);
    try {
      const result = await recipeApi.extract(recipeUrl.trim());
      if (result.name && !name.trim()) setName(result.name);
      if (result.ingredients.length > 0) {
        setIngredients(result.ingredients.map(i => ({
          name: i.name,
          quantity: i.quantity > 0 ? String(i.quantity) : '',
          unit: i.unit,
        })));
      }
      if (result.recipe_text && !recipeText.trim()) setRecipeText(result.recipe_text);
    } catch (e: any) {
      Alert.alert('抽出失敗', e.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('エラー', '料理名を入力してください'); return; }
    setSaving(true);
    try {
      const ingredientData = ingredients
        .filter(i => i.name.trim())
        .map(i => ({ name: i.name.trim(), quantity: parseFloat(i.quantity) || 0, unit: i.unit.trim() }));

      const payload = {
        name: name.trim(),
        recipe_url: recipeUrl.trim() || undefined,
        recipe_text: recipeText.trim() || undefined,
        image_data: imageData,
        ingredients: ingredientData,
      };

      if (editingDish) {
        await updateDish(editingDish.id, payload);
      } else {
        await createDish(payload);
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
        text: '削除', style: 'destructive',
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
  const removeIngredientRow = (idx: number) => setIngredients(prev => prev.filter((_, i) => i !== idx));

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      await dishesApi.seedDefaults();
      await reload();
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setSeeding(false);
    }
  };

  const filtered = dishes.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        <View style={[styles.searchBar, isDesktop && styles.searchBarDesktop]}>
          <TextInput
            style={styles.searchInput}
            placeholder="料理を検索..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textSecondary}
          />
          <TouchableOpacity style={styles.seedBtn} onPress={handleSeedDefaults} disabled={seeding}>
            <Text style={styles.seedBtnText}>{seeding ? '追加中...' : '定番追加'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ 追加</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listPanel}>
          {loading ? (
            <LoadingView />
          ) : filtered.length === 0 ? (
            <EmptyState title="料理がありません" subtitle="「+ 追加」ボタンから料理を登録しましょう" />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={d => d.id}
              contentContainerStyle={styles.list}
              numColumns={isWideDesktop ? 3 : isDesktop ? 2 : 1}
              key={isWideDesktop ? '3-col' : isDesktop ? '2-col' : '1-col'}
              columnWrapperStyle={isDesktop ? styles.columnWrap : undefined}
              renderItem={({ item }) => (
                <View style={[styles.cardWrap, isDesktop && styles.cardWrapDesktop, isWideDesktop && styles.cardWrapWide]}>
                  <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
                    {item.image_data ? (
                      <Image source={{ uri: item.image_data }} style={styles.cardImage} resizeMode="cover" />
                    ) : null}
                    <View style={styles.cardBody}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardName}>{item.name}</Text>
                        <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Text style={styles.deleteIcon}>削除</Text>
                        </TouchableOpacity>
                      </View>
                      {item.ingredients.length > 0 && (
                        <View style={styles.ingredientList}>
                          {item.ingredients.slice(0, 4).map((ing) => (
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
                          <Text style={styles.recipeUrl} numberOfLines={1}>{item.recipe_url}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </View>

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

            {/* 画像 */}
            <Text style={styles.label}>料理の画像</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              {imageData ? (
                <Image source={{ uri: imageData }} style={styles.imagePreview} resizeMode="cover" />
              ) : (
                <Text style={styles.imagePickerText}>タップして画像を選択</Text>
              )}
            </TouchableOpacity>
            {imageData && (
              <TouchableOpacity onPress={() => setImageData(undefined)}>
                <Text style={styles.removeImageText}>画像を削除</Text>
              </TouchableOpacity>
            )}

            {/* 料理名 */}
            <Text style={styles.label}>料理名 *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例: 肉じゃが"
              placeholderTextColor={Colors.textSecondary}
            />

            {/* レシピURL */}
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
            <TouchableOpacity
              style={[styles.extractBtn, extracting && styles.disabled]}
              onPress={handleExtract}
              disabled={extracting}
            >
              <Text style={styles.extractBtnText}>
                {extracting ? '抽出中...' : '↓ URLから料理名・材料・手順を抽出'}
              </Text>
            </TouchableOpacity>

            {/* 材料 */}
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

            {/* 作り方 */}
            <Text style={styles.label}>作り方・メモ</Text>
            <TextInput
              style={[styles.input, styles.recipeTextInput]}
              value={recipeText}
              onChangeText={setRecipeText}
              placeholder="手順やメモを入力..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor={Colors.textSecondary}
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  page: { flex: 1, width: '100%', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  pageDesktop: { maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  searchBar: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 12, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10, gap: 8,
  },
  searchBarDesktop: { padding: 16, gap: 12 },
  searchInput: {
    flexBasis: '100%',
    minWidth: 0,
    backgroundColor: Colors.surface, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  seedBtn: { flexGrow: 1, minWidth: 120, borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 10, minHeight: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  seedBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 16 },
  addBtn: { flexGrow: 1, minWidth: 120, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: Colors.background, fontWeight: '700', fontSize: 16 },
  listPanel: { flex: 1, minHeight: 0 },
  list: { paddingVertical: 12 },
  columnWrap: { gap: 12, marginBottom: 12 },
  cardWrap: { width: '100%', marginBottom: 12 },
  cardWrapDesktop: { flex: 1 },
  cardWrapWide: { flex: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 2, borderWidth: 1, borderColor: Colors.border, minHeight: 120,
  },
  cardImage: { width: '100%', height: 140 },
  cardBody: { padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  deleteIcon: { fontSize: 13, color: Colors.primaryDark, fontWeight: '700' },
  ingredientList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  ingredientChip: {
    backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  ingredientText: { fontSize: 13, color: Colors.textSecondary },
  recipeUrl: { fontSize: 13, color: Colors.primary, marginTop: 8 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  modalCancel: { fontSize: 16, color: Colors.textSecondary },
  modalDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  disabled: { opacity: 0.4 },
  modalBody: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 16 },
  imagePicker: {
    height: 160, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { fontSize: 16, color: Colors.textSecondary },
  removeImageText: { fontSize: 13, color: Colors.error, marginTop: 6, textAlign: 'center' },
  input: {
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, padding: 12, minHeight: 44, fontSize: 16, color: Colors.text,
  },
  extractBtn: {
    marginTop: 8, paddingVertical: 10, paddingHorizontal: 14,
    minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  extractBtnText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  addIngredientBtn: { padding: 4 },
  addIngredientBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  ingredientRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6, alignItems: 'center' },
  ingredientName: { flexBasis: '100%', margin: 0 },
  ingredientQty: { flexGrow: 1, flexBasis: 110, minWidth: 0, margin: 0 },
  ingredientUnit: { flexGrow: 1, flexBasis: 110, minWidth: 0, margin: 0 },
  removeBtn: { padding: 8 },
  removeBtnText: { color: Colors.error, fontSize: 16, fontWeight: '600' },
  recipeTextInput: { minHeight: 120, lineHeight: 22 },
});
