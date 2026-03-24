import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, useWindowDimensions, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../src/components/Colors';

const HERO_IMAGE = require('../assets/hero.jpg');

const FEATURES = [
  {
    icon: '🗓️',
    title: '献立カレンダー',
    desc: '週・月単位で献立を管理。家族全員が同じカレンダーを共有できるので「今日の夕食は？」が一目でわかります。',
  },
  {
    icon: '🍽️',
    title: '料理マスタ',
    desc: '30品の定番料理があらかじめ登録済み。レシピURLを入力するだけで材料・手順を自動抽出。写真も登録できます。',
  },
  {
    icon: '🛒',
    title: '買い物リスト',
    desc: '献立から必要な材料を自動生成。家族全員がリアルタイムで共有・チェックできます。',
  },
  {
    icon: '✅',
    title: 'TODO管理',
    desc: '家族の共有タスクを一元管理。期限設定で期限切れのタスクはひと目でわかります。',
  },
  {
    icon: '👨‍👩‍👧',
    title: '家族共有',
    desc: 'メールアドレスで招待するだけ。家族グループを作れば全データをリアルタイムで共有できます。',
  },
  {
    icon: '🔗',
    title: 'レシピURL抽出',
    desc: 'クックパッドや食べログなどのレシピURLを入力すると、料理名・材料・作り方を自動で取り込みます。',
  },
];

const STEPS = [
  { num: '1', title: 'アカウント登録', desc: 'メールアドレスとパスワードだけで登録できます。確認メールをクリックするだけで完了。' },
  { num: '2', title: '料理マスタを確認', desc: '定番料理30品が最初から入っています。レシピURLから好みの料理を追加しましょう。' },
  { num: '3', title: '献立をたてる', desc: 'カレンダーで日付を選んで料理を選ぶだけ。週・月で俯瞰できます。' },
  { num: '4', title: '家族を招待', desc: 'メールアドレスで家族を招待。招待を承認すると全データが共有されます。' },
];

export default function LandingPage() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <Text style={styles.logo}>🫒 Olive</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
            <Text style={styles.loginBtnText}>ログイン</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/login')}>
            <Text style={styles.registerBtnText}>無料で始める</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero */}
      <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
        <View style={[styles.heroText, isDesktop && styles.heroTextDesktop]}>
          <Text style={styles.heroTitle}>家族の献立を{'\n'}ひとつのアプリで</Text>
          <Text style={styles.heroSubtitle}>
            献立カレンダー・料理マスタ・買い物リスト・TODOを家族でリアルタイム共有。
            毎日の「今日何食べる？」を解決します。
          </Text>
          <View style={styles.heroBtns}>
            <TouchableOpacity style={styles.heroCta} onPress={() => router.push('/login')}>
              <Text style={styles.heroCtaText}>無料で始める</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroDemo} onPress={() => router.push('/login')}>
              <Text style={styles.heroDemoText}>デモを試す</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.heroImageWrap, isDesktop && styles.heroImageWrapDesktop]}>
          <Image source={HERO_IMAGE} style={[styles.heroImage, isDesktop && styles.heroImageDesktop]} resizeMode="cover" />
        </View>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Oliveでできること</Text>
        <Text style={styles.sectionSubtitle}>家族の食卓まわりをまるごとサポート</Text>
        <View style={[styles.featureGrid, isDesktop && styles.featureGridDesktop]}>
          {FEATURES.map((f) => (
            <View key={f.title} style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* How to use */}
      <View style={[styles.section, styles.sectionAlt]}>
        <Text style={styles.sectionTitle}>はじめ方</Text>
        <Text style={styles.sectionSubtitle}>4ステップで家族と共有できる</Text>
        <View style={[styles.stepsWrap, isDesktop && styles.stepsWrapDesktop]}>
          {STEPS.map((s, i) => (
            <View key={s.num} style={[styles.stepCard, isDesktop && styles.stepCardDesktop]}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.num}</Text>
              </View>
              {i < STEPS.length - 1 && isDesktop && <View style={styles.stepArrow}><Text style={styles.stepArrowText}>→</Text></View>}
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepDesc}>{s.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>まず無料で試してみる</Text>
        <Text style={styles.ctaSubtitle}>登録不要のデモアカウントでもすぐに体験できます</Text>
        <View style={styles.ctaBtns}>
          <TouchableOpacity style={styles.ctaMainBtn} onPress={() => router.push('/login')}>
            <Text style={styles.ctaMainBtnText}>無料でアカウントを作成</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaSubBtn} onPress={() => router.push('/login')}>
            <Text style={styles.ctaSubBtnText}>デモアカウントで試す</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerLogo}>🫒 Olive</Text>
        <Text style={styles.footerCopy}>© 2026 Olive. All rights reserved.</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flexGrow: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerDesktop: { paddingHorizontal: 60 },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.primaryDark },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  loginBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  loginBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  registerBtn: { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20 },
  registerBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  // Hero
  hero: { backgroundColor: Colors.background, padding: 32, paddingBottom: 48 },
  heroDesktop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 60, paddingVertical: 64, gap: 48 },
  heroText: { flex: 1 },
  heroTextDesktop: { maxWidth: 520 },
  heroTitle: { fontSize: 32, fontWeight: '800', color: Colors.primaryDark, lineHeight: 44, marginBottom: 16 },
  heroSubtitle: { fontSize: 16, color: Colors.textSecondary, lineHeight: 26, marginBottom: 28 },
  heroBtns: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  heroCta: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24 },
  heroCtaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  heroDemo: { borderWidth: 1.5, borderColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24 },
  heroDemoText: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  heroImageWrap: { marginTop: 32, borderRadius: 16, overflow: 'hidden', width: '100%', aspectRatio: 4 / 3 },
  heroImageWrapDesktop: { marginTop: 0, flex: 1, maxWidth: 560 },
  heroImage: { width: '100%', height: '100%' },
  heroImageDesktop: {},

  // Section
  section: { paddingVertical: 60, paddingHorizontal: 24 },
  sectionAlt: { backgroundColor: Colors.background },
  sectionTitle: { fontSize: 26, fontWeight: '800', color: Colors.primaryDark, textAlign: 'center', marginBottom: 8 },
  sectionSubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 36 },

  // Features
  featureGrid: { gap: 16 },
  featureGridDesktop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  featureCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24,
    borderWidth: 1, borderColor: Colors.border,
  },
  featureCardDesktop: { width: '30%', minWidth: 240, flex: undefined },
  featureIcon: { fontSize: 32, marginBottom: 12 },
  featureTitle: { fontSize: 17, fontWeight: '700', color: Colors.primaryDark, marginBottom: 8 },
  featureDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },

  // Steps
  stepsWrap: { gap: 16 },
  stepsWrapDesktop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  stepCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  stepCardDesktop: { flex: 1, maxWidth: 220, position: 'relative' },
  stepNum: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  stepNumText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  stepArrow: { position: 'absolute', right: -20, top: 36, zIndex: 1 },
  stepArrowText: { fontSize: 20, color: Colors.primaryLight },
  stepTitle: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark, marginBottom: 8, textAlign: 'center' },
  stepDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, textAlign: 'center' },

  // CTA section
  ctaSection: {
    backgroundColor: Colors.primaryDark, paddingVertical: 64, paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaTitle: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  ctaSubtitle: { fontSize: 15, color: Colors.primaryLight, textAlign: 'center', marginBottom: 32 },
  ctaBtns: { gap: 12, alignItems: 'center' },
  ctaMainBtn: { backgroundColor: Colors.accent, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 28 },
  ctaMainBtnText: { color: Colors.primaryDark, fontWeight: '800', fontSize: 17 },
  ctaSubBtn: { borderWidth: 1.5, borderColor: Colors.primaryLight, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28 },
  ctaSubBtnText: { color: Colors.primaryLight, fontWeight: '600', fontSize: 15 },

  // Footer
  footer: { paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center', gap: 8, backgroundColor: '#fff' },
  footerLogo: { fontSize: 18, fontWeight: '800', color: Colors.primaryDark },
  footerCopy: { fontSize: 12, color: Colors.textSecondary },
});
