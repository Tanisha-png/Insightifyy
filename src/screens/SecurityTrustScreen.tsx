import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  onContinue?: () => void;
};

function TrustRow({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.bullet} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowText}>{body}</Text>
      </View>
    </View>
  );
}

export function SecurityTrustScreen({ onContinue }: Props) {
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.appName}>Insightifyy</Text>
          <Text style={styles.title}>Your financial Guardian Angel</Text>
          <Text style={styles.subtitle}>
            Plain-English security & privacy, before you connect anything.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy Policy (Plain English)</Text>

          <TrustRow
            title="Read-Only Access"
            body="We can see your balance to help you, but we can never move, withdraw, or spend your money."
          />
          <TrustRow
            title="Bank-Level Vault"
            body="Your data is shielded by AES-256 encryption—the same standard used by global banks."
          />
          <TrustRow
            title="No Data Selling"
            body="We make money by helping you save, not by selling your data to advertisers."
          />
          <TrustRow
            title="Total Control"
            body="Disconnect your accounts or delete your data instantly at any time."
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>I Understand</Text>
          </Pressable>

          <Text style={styles.footnote}>
            You’re in control. We only act on what you explicitly approve.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070A12',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 64, android: 40, default: 40 }),
    paddingBottom: 40,
    gap: 18,
  },
  hero: {
    gap: 10,
  },
  appName: {
    color: '#9AE6FF',
    fontSize: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(154,230,255,0.18)',
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: '#9AE6FF',
    shadowColor: '#9AE6FF',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  rowText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: '#1D4ED8',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footnote: {
    color: 'rgba(255,255,255,0.56)',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
});

