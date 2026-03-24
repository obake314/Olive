import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, useWindowDimensions, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../src/components/Colors';
import { useAuth } from '../src/context/AuthContext';

const HERO_IMAGE = require('../assets/hero.jpg');

const FEATURES = [
  {
    title: '献立カレンダー',
    desc: '週・月単位で献立を管理。家族全員が同じカレンダーを共有できるので「今日の夕食は？」が一目でわかります。',
  },
  {
    title: '料理マスタ',
    desc: '30品の定番料理があらかじめ登録済み。レシピURLを入力するだけで材料・手順を自動抽出。写真も登録できます。',
  },
  {
    title: '買い物リスト',
    desc: '献立から必要な材料を自動生成。家族全員がリアルタイムで共有・チェックできます。',
  },
  {
    title: 'TODO管理',
    desc: '家族の共有タスクを一元管理。期限設定で期限切れのタスクはひと目でわかります。',
  },
  {
    title: '家族共有',
    desc: 'メールアドレスで招待するだけ。家族グループを作れば全データをリアルタイムで共有できます。',
  },
  {
    title: 'レシピURL抽出',
    desc: 'クックパッドや食べログなどのレシピURLを入力すると、料理名・材料・作り方を自動で取り込みます。',
  },
];

const STEPS = [
  { num: '1', title: 'アカウント登録', desc: 'メールアドレスとパスワードだけで登録。確認メールをクリックするだけで完了。' },
  { num: '2', title: '料理マスタを確認', desc: '定番料理30品が最初から入っています。レシピURLから好みの料理を追加できます。' },
  { num: '3', title: '献立をたてる', desc: 'カレンダーで日付を選んで料理を選ぶだけ。週・月で俯瞰できます。' },
  { num: '4', title: '家族を招待', desc: 'メールアドレスで家族を招待。承認すると全データが共有されます。' },
];

function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!email || !password) {
      setErrorMsg('メールアドレスとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const res = await register(email, password);
        setSuccessMsg(res.message);
        setMode('login');
        setPassword('');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await login('demo@olive.app', 'demo1234');
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={formStyles.card}>
      <View style={formStyles.tabs}>
        <TouchableOpacity
          style={[formStyles.tab, mode === 'login' && formStyles.tabActive]}
          onPress={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
        >
          <Text style={[formStyles.tabText, mode === 'login' && formStyles.tabTextActive]}>ログイン</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[formStyles.tab, mode === 'register' && formStyles.tabActive]}
          onPress={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
        >
          <Text style={[formStyles.tabText, mode === 'register' && formStyles.tabTextActive]}>新規登録</Text>
        </TouchableOpacity>
      </View>

      {successMsg ? <Text style={formStyles.successText}>{successMsg}</Text> : null}
      {errorMsg ? <Text style={formStyles.errorText}>{errorMsg}</Text> : null}

      <TextInput
        style={formStyles.input}
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={Colors.textSecondary}
      />
      <TextInput
        style={formStyles.input}
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={Colors.textSecondary}
      />

      <TouchableOpacity
        style={[formStyles.btn, loading && formStyles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={formStyles.btnText}>
          {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
        </Text>
      </TouchableOpacity>

      <View style={formStyles.divider}>
        <View style={formStyles.dividerLine} />
        <Text style={formStyles.dividerText}>または</Text>
        <View style={formStyles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[formStyles.demoBtn, loading && formStyles.btnDisabled]}
        onPress={handleDemo}
        disabled={loading}
      >
        <Text style={formStyles.demoBtnText}>デモアカウントで試す</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function LandingPage() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerOuter}>
          <View style={[styles.header, isDesktop && styles.headerDesktop]}>
            <Text style={styles.logo}>Olive</Text>
          </View>
        </View>

        {/* Hero + Form (first view) */}
        <View style={styles.heroOuter}>
          <View style={[styles.heroInner, isDesktop && styles.heroInnerDesktop]}>

            {/* Left: hero image + copy */}
            <View style={[styles.heroLeft, isDesktop && styles.heroLeftDesktop]}>
              <View style={[styles.heroImageWrap, isDesktop && styles.heroImageWrapDesktop]}>
                <Image source={HERO_IMAGE} style={styles.heroImage} resizeMode="cover" />
              </View>
              <Text style={styles.heroTitle}>家族の献立を{'\n'}ひとつのアプリで</Text>
              <Text style={styles.heroSubtitle}>
                献立カレンダー・料理マスタ・買い物リスト・TODOを家族でリアルタイム共有。毎日の「今日何食べる？」を解決します。
              </Text>
            </View>

            {/* Right: auth form */}
            <View style={[styles.heroRight, isDesktop && styles.heroRightDesktop]}>
              <AuthForm />
            </View>

          </View>
        </View>

        {/* Features */}
        <View style={styles.sectionOuter}>
          <View style={[styles.sectionInner, isDesktop && styles.sectionInnerDesktop]}>
            <Text style={styles.sectionTitle}>Oliveでできること</Text>
            <Text style={styles.sectionSubtitle}>家族の食卓まわりをまるごとサポート</Text>
            <View style={[styles.featureGrid, isDesktop && styles.featureGridDesktop]}>
              {FEATURES.map((f) => (
                <View key={f.title} style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* How to use */}
        <View style={[styles.sectionOuter, styles.sectionAlt]}>
          <View style={[styles.sectionInner, isDesktop && styles.sectionInnerDesktop]}>
            <Text style={styles.sectionTitle}>はじめ方</Text>
            <Text style={styles.sectionSubtitle}>4ステップで家族と共有できる</Text>
            <View style={[styles.stepsWrap, isDesktop && styles.stepsWrapDesktop]}>
              {STEPS.map((s, i) => (
                <View key={s.num} style={[styles.stepCard, isDesktop && styles.stepCardDesktop]}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{s.num}</Text>
                  </View>
                  {i < STEPS.length - 1 && isDesktop && (
                    <View style={styles.stepArrow}><Text style={styles.stepArrowText}>→</Text></View>
                  )}
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>Olive</Text>
          <Text style={styles.footerCopy}>© 2026 Olive. All rights reserved.</Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flexGrow: 1 },

  // Header
  headerOuter: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  header: { paddingHorizontal: 24, paddingVertical: 16, maxWidth: 1100, alignSelf: 'center', width: '100%' },
  headerDesktop: { paddingHorizontal: 40 },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.primaryDark },

  // Hero
  heroOuter: { backgroundColor: Colors.background },
  heroInner: { maxWidth: 1100, alignSelf: 'center', width: '100%', padding: 24, paddingVertical: 40 },
  heroInnerDesktop: { flexDirection: 'row', alignItems: 'center', gap: 48, paddingHorizontal: 40, paddingVertical: 60 },
  heroLeft: { flex: 1 },
  heroLeftDesktop: { flex: 1 },
  heroImageWrap: { borderRadius: 12, overflow: 'hidden', width: '100%', aspectRatio: 16 / 9, marginBottom: 24 },
  heroImageWrapDesktop: { aspectRatio: 4 / 3 },
  heroImage: { width: '100%', height: '100%' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: Colors.primaryDark, lineHeight: 40, marginBottom: 12 },
  heroSubtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  heroRight: { width: '100%', marginTop: 32 },
  heroRightDesktop: { width: 380, marginTop: 0, flexShrink: 0 },

  // Sections
  sectionOuter: { backgroundColor: '#fff' },
  sectionAlt: { backgroundColor: Colors.background },
  sectionInner: { maxWidth: 1100, alignSelf: 'center', width: '100%', paddingVertical: 60, paddingHorizontal: 24 },
  sectionInnerDesktop: { paddingHorizontal: 40 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: Colors.primaryDark, textAlign: 'center', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 36 },

  // Features
  featureGrid: { gap: 16 },
  featureGridDesktop: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  featureCard: {
    backgroundColor: Colors.background, borderRadius: 10, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  featureCardDesktop: { flex: 1, minWidth: 280, maxWidth: '31%' },
  featureTitle: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark, marginBottom: 8 },
  featureDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 21 },

  // Steps
  stepsWrap: { gap: 16 },
  stepsWrapDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 20,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  stepCardDesktop: { flex: 1, position: 'relative' },
  stepNum: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  stepNumText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  stepArrow: { position: 'absolute', right: -14, top: 32, zIndex: 1 },
  stepArrowText: { fontSize: 18, color: Colors.primaryLight },
  stepTitle: { fontSize: 15, fontWeight: '700', color: Colors.primaryDark, marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 19, textAlign: 'center' },

  // Footer
  footer: { paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', gap: 6, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8e8e8' },
  footerLogo: { fontSize: 16, fontWeight: '800', color: Colors.primaryDark },
  footerCopy: { fontSize: 11, color: Colors.textSecondary },
});

const formStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  tabs: { flexDirection: 'row', marginBottom: 20, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.background },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: 13, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.background, marginBottom: 12,
  },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 8,
    padding: 15, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: Colors.textSecondary },
  successText: { color: '#2d7a4a', fontSize: 13, marginBottom: 12, textAlign: 'center', backgroundColor: '#e6f4ea', padding: 10, borderRadius: 6 },
  errorText: { color: Colors.error, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  demoBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 8,
    padding: 15, alignItems: 'center', backgroundColor: Colors.background,
  },
  demoBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
