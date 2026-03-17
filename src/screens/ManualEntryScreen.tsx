import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PurchaseAnalyzer } from '../domain/PurchaseAnalyzer';
import type { PurchaseCategory } from '../domain/PurchaseAnalyzer';

type Props = {
  onBack?: () => void;
  initialMonthlySurplus?: number;
};

export function ManualEntryScreen({ onBack, initialMonthlySurplus }: Props) {
  const analyzer = useMemo(() => new PurchaseAnalyzer(), []);

  const [liquidSavings, setLiquidSavings] = useState('12000');
  const [monthlyExpenses, setMonthlyExpenses] = useState('3200');
  const [monthlySurplus, setMonthlySurplus] = useState(String(initialMonthlySurplus ?? 800));
  const [purchaseAmount, setPurchaseAmount] = useState('399');
  const [category, setCategory] = useState<PurchaseCategory>('Want');
  const [isEmergency, setIsEmergency] = useState(false);
  const [hasRewardsCard, setHasRewardsCard] = useState(true);
  const [canPayInFull, setCanPayInFull] = useState(true);
  const [bnpl0, setBnpl0] = useState(false);

  const analysis = analyzer.analyze({
    purchaseAmount: toNumber(purchaseAmount),
    purchaseCategory: category,
    isEmergency,
    liquidSavings: toNumber(liquidSavings),
    monthlyEssentialExpenses: toNumber(monthlyExpenses),
    monthlySurplus: toNumber(monthlySurplus),
    hasRewardsCard,
    canPayStatementInFull: canPayInFull,
    bnplIs0Percent: bnpl0,
  });

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Phase 1</Text>
          <Text style={styles.title}>Manual entry</Text>
          <Text style={styles.subtitle}>
            Use this to test verdicts and execution strategies before live account sync.
          </Text>
        </View>

        <View style={styles.card}>
          <Field
            label="Liquid savings"
            value={liquidSavings}
            onChange={setLiquidSavings}
            helper="Cash + checking + savings you can access fast"
          />
          <Field
            label="Monthly essential expenses"
            value={monthlyExpenses}
            onChange={setMonthlyExpenses}
            helper="Rent, food, utilities, minimums, etc."
          />
          <Field
            label="Monthly surplus"
            value={monthlySurplus}
            onChange={setMonthlySurplus}
            helper="Income minus expenses (what you can save monthly)"
          />
          <Field label="Purchase amount" value={purchaseAmount} onChange={setPurchaseAmount} />

          <View style={styles.row}>
            <Text style={styles.label}>Purchase type</Text>
            <View style={styles.pills}>
              <Pill active={category === 'Need'} onPress={() => setCategory('Need')} text="Need" />
              <Pill active={category === 'Want'} onPress={() => setCategory('Want')} text="Want" />
            </View>
          </View>

          <Toggle
            label="Emergency"
            value={isEmergency}
            onValueChange={setIsEmergency}
            helper="Overrides the emergency fund shield when truly necessary"
          />
          <Toggle label="Has rewards card" value={hasRewardsCard} onValueChange={setHasRewardsCard} />
          <Toggle
            label="Can pay statement in full"
            value={canPayInFull}
            onValueChange={setCanPayInFull}
            helper="If not, we avoid interest traps"
          />
          <Toggle
            label="BNPL is 0% interest"
            value={bnpl0}
            onValueChange={setBnpl0}
            helper="Only recommended for true needs when 0%"
          />
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Verdict</Text>
          <Text
            style={[
              styles.verdict,
              analysis.verdict === 'Good Purchase' ? styles.good : styles.bad,
            ]}
          >
            {analysis.verdict}
          </Text>

          {analysis.verdict === 'Bad Purchase' && analysis.pathToYes?.message ? (
            <View style={styles.pathCard}>
              <Text style={styles.pathTitle}>The Path to Yes</Text>
              <Text style={styles.pathText}>{analysis.pathToYes.countdown}</Text>
              {analysis.pathToYes.proTip ? (
                <Text style={styles.pathMeta}>{analysis.pathToYes.proTip}</Text>
              ) : null}
              {Number.isFinite(analysis.pathToYes.monthsToSafeBuy) ? (
                <Text style={styles.pathMeta}>
                  Shortfall: ${analysis.pathToYes.shortfall} • Timeline: {analysis.pathToYes.monthsToSafeBuy}{' '}
                  month(s)
                </Text>
              ) : (
                <Text style={styles.pathMeta}>
                  Shortfall: ${analysis.pathToYes.shortfall} • Timeline: not available without surplus
                </Text>
              )}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Best execution</Text>
          {analysis.strategies.length === 0 ? (
            <Text style={styles.muted}>No strategy (blocked by risk rules).</Text>
          ) : (
            analysis.strategies.map((s) => (
              <Text key={s} style={styles.strategy}>
                • {s}
              </Text>
            ))
          )}

          <Text style={styles.sectionTitle}>Why</Text>
          {analysis.reasons.map((r, idx) => (
            <Text key={`${idx}-${r}`} style={styles.reason}>
              • {r}
            </Text>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
        >
          <Text style={styles.secondaryText}>Back to Trust screen</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helper?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      {props.helper ? <Text style={styles.helper}>{props.helper}</Text> : null}
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        keyboardType="decimal-pad"
        style={styles.input}
        placeholder="0"
        placeholderTextColor="rgba(255,255,255,0.35)"
      />
    </View>
  );
}

function Toggle(props: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  helper?: string;
}) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.label}>{props.label}</Text>
        {props.helper ? <Text style={styles.helper}>{props.helper}</Text> : null}
      </View>
      <Switch value={props.value} onValueChange={props.onValueChange} />
    </View>
  );
}

function Pill(props: { text: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.pill,
        props.active && styles.pillActive,
        pressed && styles.pillPressed,
      ]}
    >
      <Text style={[styles.pillText, props.active && styles.pillTextActive]}>{props.text}</Text>
    </Pressable>
  );
}

function toNumber(s: string): number {
  const n = Number(String(s).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070A12' },
  content: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 48, gap: 16 },
  header: { gap: 8 },
  kicker: {
    color: '#9AE6FF',
    fontSize: 12,
    letterSpacing: 2.1,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 20 },
  card: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(154,230,255,0.18)',
    padding: 16,
    gap: 14,
  },
  field: { gap: 6 },
  label: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  helper: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 16 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillActive: {
    borderColor: 'rgba(154,230,255,0.55)',
    backgroundColor: 'rgba(154,230,255,0.10)',
  },
  pillPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  pillText: { color: 'rgba(255,255,255,0.75)', fontWeight: '800' },
  pillTextActive: { color: '#9AE6FF' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
    gap: 8,
  },
  resultTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  verdict: { fontSize: 22, fontWeight: '900' },
  good: { color: '#34D399' },
  bad: { color: '#FB7185' },
  pathCard: {
    marginTop: 2,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(29,78,216,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(154,230,255,0.20)',
    gap: 6,
  },
  pathTitle: { color: '#9AE6FF', fontSize: 12, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  pathText: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  pathMeta: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  sectionTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginTop: 6 },
  strategy: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18 },
  reason: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 18 },
  muted: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  secondaryPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  secondaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});

