import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  Alert, ScrollView, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { LoadingView } from '../../src/components/LoadingView';
import { familyApi } from '../../src/api/client';
import { Family, FamilyMember } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

export default function FamilyScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const { user } = useAuth();

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await familyApi.get();
      setFamily(data.family);
      setMembers(data.members);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const handleCreate = async () => {
    if (!familyName.trim()) { Alert.alert('エラー', 'グループ名を入力してください'); return; }
    setCreating(true);
    try {
      await familyApi.create(familyName.trim());
      setFamilyName('');
      await reload();
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { Alert.alert('エラー', 'メールアドレスを入力してください'); return; }
    setInviting(true);
    try {
      const res = await familyApi.invite(inviteEmail.trim());
      Alert.alert('送信完了', res.message);
      setInviteEmail('');
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setInviting(false);
    }
  };

  const handleLeave = () => {
    Alert.alert('グループから離脱', '家族グループから離脱しますか？\nデータは共有されなくなります。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '離脱する', style: 'destructive', onPress: async () => {
        await familyApi.leave();
        await reload();
      }},
    ]);
  };

  if (loading) return <LoadingView />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      {!family ? (
        /* グループ未所属 */
        <View style={styles.card}>
          <Text style={styles.cardTitle}>家族グループを作成</Text>
          <Text style={styles.cardDesc}>グループを作成して家族を招待すると、献立・TODO・料理マスタを共有できます。</Text>
          <Text style={styles.label}>グループ名</Text>
          <TextInput
            style={styles.input}
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="例: 岡崎家"
            placeholderTextColor={Colors.textSecondary}
          />
          <TouchableOpacity style={[styles.btn, creating && styles.btnDisabled]} onPress={handleCreate} disabled={creating}>
            <Text style={styles.btnText}>{creating ? '作成中...' : 'グループを作成'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* グループ所属済み */
        <>
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{family.name}</Text>
              <TouchableOpacity onPress={handleLeave}>
                <Text style={styles.leaveText}>離脱</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.memberCount}>{members.filter(m => m.status === 'active').length}人のメンバー</Text>

            {members.map(m => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{m.name.charAt(0)}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {m.name}{m.id === user?.id ? ' (あなた)' : ''}
                  </Text>
                  <Text style={styles.memberEmail}>{m.email}</Text>
                </View>
                {m.status === 'pending' && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>招待中</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>家族を招待</Text>
            <Text style={styles.cardDesc}>メールアドレスに招待リンクを送信します。</Text>
            <Text style={styles.label}>メールアドレス</Text>
            <TextInput
              style={styles.input}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="family@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity style={[styles.btn, inviting && styles.btnDisabled]} onPress={handleInvite} disabled={inviting}>
              <Text style={styles.btnText}>{inviting ? '送信中...' : '招待メールを送る'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 16 },
  contentDesktop: { maxWidth: 640, alignSelf: 'center', width: '100%', paddingTop: 24 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, padding: 20,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16, lineHeight: 22 },
  memberCount: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, padding: 12,
    minHeight: 44, fontSize: 16, color: Colors.text, marginBottom: 12,
  },
  btn: { backgroundColor: Colors.primary, borderRadius: 8, padding: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  leaveText: { fontSize: 14, color: Colors.primaryDark, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 12 },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  memberEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  pendingBadge: { backgroundColor: Colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  pendingText: { fontSize: 13, color: Colors.primaryDark, fontWeight: '600' },
});
