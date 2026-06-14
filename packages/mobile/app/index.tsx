import { StyleSheet, Text, View } from 'react-native';

// Placeholder home screen. Real flow:
//   - map (react-native-maps) centered on the user
//   - "I need help" button -> create request
//   - "Available to help" toggle -> background location + push registration
export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚗 RoadMate</Text>
      <Text style={styles.subtitle}>Community roadside assistance</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, opacity: 0.6 },
});
