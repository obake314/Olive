import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Colors } from './Colors';

// web用: input[type=date]
function WebDateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (Platform.OS !== 'web') return null;
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '12px',
        fontSize: '16px',
        border: `1px solid ${Colors.border}`,
        borderRadius: '8px',
        backgroundColor: Colors.surface,
        color: Colors.text,
        boxSizing: 'border-box',
        minHeight: '44px',
      }}
    />
  );
}

interface Props {
  value: string;        // YYYY-MM-DD or ''
  onChange: (v: string) => void;
  placeholder?: string;
}

export function DatePickerField({ value, onChange, placeholder = '日付を選択' }: Props) {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return <WebDateInput value={value} onChange={onChange} />;
  }

  // native: 遅延インポートでDateTimePickerを使う
  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  const date = value ? new Date(value + 'T00:00:00') : new Date();

  const handleChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      onChange(selected.toISOString().split('T')[0]);
    }
  };

  return (
    <View>
      <TouchableOpacity style={styles.trigger} onPress={() => setShow(true)}>
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {show && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide">
          <View style={styles.iosOverlay}>
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => { onChange(''); setShow(false); }}>
                  <Text style={styles.iosClear}>クリア</Text>
                </TouchableOpacity>
                <Text style={styles.iosTitle}>日付を選択</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.iosDone}>完了</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleChange}
                locale="ja"
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </Modal>
      )}

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleChange}
          locale="ja"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    padding: 12, minHeight: 44,
  },
  triggerText: { fontSize: 16, color: Colors.text },
  placeholder: { color: Colors.textSecondary },
  icon: { fontSize: 18 },
  iosOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  iosSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  iosHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  iosTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  iosClear: { fontSize: 16, color: Colors.error },
  iosDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});
