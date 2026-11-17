import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/AppShell";
import { Card, Badge, Field, Button, EmptyState, Loading, SectionHeader } from "../components/ui";
import { ListRow, Divider } from "../components/Row";
import { api } from "../lib/api";
import { formatCurrency, relativeDue } from "../lib/format";
import { colors, spacing } from "../lib/theme";

const BUCKET_META: Record<string, { label: string; tone: "warning" | "danger" | "danger" | "danger" }> = {
  EARLY: { label: "1–7 days overdue", tone: "warning" },
  LATE: { label: "8–30 days overdue", tone: "warning" },
  SEVERE: { label: "31–60 days overdue", tone: "danger" },
  CRITICAL: { label: "60+ days overdue", tone: "danger" },
};

export default function Recovery() {
  const [buckets, setBuckets] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/recovery/overview");
      setBuckets(res.buckets);
      setTotal(res.totalOverdue);
    } catch {
      setBuckets([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ask = async () => {
    if (!prompt.trim()) return;
    setAsking(true);
    setAssistantError(null);
    try {
      const res = await api.post("/api/ai/ask", { prompt });
      setAnswer(res.answer);
      setMode(res.mode);
    } catch (e: any) {
      setAssistantError(e?.message || "Could not reach AI assistant.");
    } finally {
      setAsking(false);
    }
  };

  const suggestions = [
    "Which invoices need attention today?",
    "Which clients have the highest outstanding balances?",
    "Write a reminder for a client 15 days late.",
    "Suggest a recovery strategy for my overdue invoices.",
  ];

  return (
    <AppShell title="AI Recovery" subtitle={`${total > 0 ? formatCurrency(total) : "$0"} overdue total`}>
      <SectionHeader title="Overdue by age" />
      {buckets === null ? <Loading /> : null}

      {buckets && buckets.filter((b) => b.count > 0).length === 0 ? (
        <EmptyState title="Nothing overdue 🎉" message="No invoices are currently past due." />
      ) : null}

      {buckets
        ? buckets.filter((b) => b.count > 0).map((b) => (
          <Card key={b.bucket} style={styles.bucketCard}>
            <View style={styles.bucketHead}>
              <Badge label={BUCKET_META[b.bucket]?.label || b.bucket} tone={BUCKET_META[b.bucket]?.tone} />
              <Text style={styles.bucketAmount}>{formatCurrency(b.amount)}</Text>
            </View>
            {b.invoices.map((inv: any) => (
              <View key={inv.id}>
                <ListRow
                  title={`${inv.number} · ${inv.clientName}`}
                  subtitle={relativeDue(inv.dueDate)}
                  right={<Text style={styles.amount}>{formatCurrency(inv.outstanding)}</Text>}
                />
                <Text style={styles.strategy} numberOfLines={3}>{inv.strategy}</Text>
              </View>
            ))}
          </Card>
        ))
        : null}

      <SectionHeader title="AI assistant" />
      <Card>
        <Text style={styles.assistantHint}>
          Ask about your overdue invoices and get recovery guidance.
          {mode === "demo" ? " Running in Demo mode (simulated)." : ""}
        </Text>

        {suggestions.map((s) => (
          <Button key={s} title={s} variant="secondary" onPress={() => setPrompt(s)} style={styles.suggestion} fullWidth={false} />
        ))}

        <Field
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask the recovery assistant…"
          multiline
        />
        <Button title="Ask" onPress={ask} loading={asking} />

        {assistantError ? <Text style={styles.error}>{assistantError}</Text> : null}
        {answer ? (
          <View style={styles.answer}>
            <Text style={styles.answerText}>{answer}</Text>
            {mode ? <Text style={styles.answerMode}>mode: {mode}</Text> : null}
          </View>
        ) : null}
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  bucketCard: { marginBottom: spacing.md, gap: 4 },
  bucketHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  bucketAmount: { fontSize: 16, fontWeight: "800" },
  amount: { fontSize: 15, fontWeight: "700" },
  strategy: { color: colors.muted, fontSize: 13, lineHeight: 18, paddingBottom: spacing.sm },
  assistantHint: { color: colors.muted, fontSize: 13, marginBottom: spacing.md, lineHeight: 18 },
  suggestion: { marginBottom: 8, alignSelf: "flex-start" },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600", marginTop: spacing.md },
  answer: {
    marginTop: spacing.md, backgroundColor: colors.primarySoft, borderRadius: 12,
    padding: spacing.md,
  },
  answerText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  answerMode: { color: colors.primary, fontSize: 12, fontWeight: "600", marginTop: 6 },
});
