import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/components/Colors';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconFocused]}>
      <Text style={styles.emoji}>{emoji}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'カレンダー',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
          headerTitle: '献立カレンダー',
        }}
      />
      <Tabs.Screen
        name="dishes"
        options={{
          title: '料理マスタ',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🍳" focused={focused} />,
          headerTitle: '料理マスタ',
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: '買い物リスト',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} />,
          headerTitle: '買い物リスト',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: { padding: 4, borderRadius: 8 },
  iconFocused: { backgroundColor: Colors.primaryLight },
  emoji: { fontSize: 22 },
});
