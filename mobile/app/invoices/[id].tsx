import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppShell } from "../../components/AppShell";
import { Card, Badge, Button, EmptyState, Loading } from "../../components/ui";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { colors, spacing } from "../../lib/theme";

const statusLabel: Record<string, string> = {
  DRAFT: "Draft", SENT: "Sent", PAID: "Paid",
  PARTIALLY_PAID: "Partially paid", OVERDUE: "Overdue", CANCELLED: "Cancelled",
};

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/invoices/${id}`);
      setInvoice(res.invoice);
    } catch {
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (status: string) => {
    try {
      await api.patch(`/api/invoices/${id}`, { status });
      load();
    } catch {}
  };

  return (
    <AppShell title="Invoice" scroll={false}>
      {loading ? <Loading /> : null}
      {!loading && !invoice ? <EmptyState title="Invoice not found" /> : null}

      {invoice ? (
        <>
          <View style={styles.head}>
            <Text style={styles.number}>{invoice.number}</Text>
            <View style={styles.headRight}>
              <Badge label={statusLabel[invoice.status] || invoice.status} tone={invoice.status === "PAID" ? "success" : invoice.status === "OVERDUE" ? "danger" : "info"} />
            </View>
          </View>

          <Card>
            <View style={styles.kv}><Text style={styles.k}>Client</Text><Text style={styles.v}>{invoice.client?.name}</Text></View>
            <View style={styles.kv}><Text style={styles.k}>Issued</Text><Text style={styles.v}>{formatDate(invoice.issueDate)}</Text></View>
            <View style={styles.kv}><Text style={styles.k}>Due</Text><Text style={styles.v}>{formatDate(invoice.dueDate)}</Text></View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Line items</Text>
            {(invoice.items || []).map((it: any, i: number) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.v}>{it.description}</Text>
                <Text style={styles.v}>{formatCurrency(it.amount, invoice.currency)}</Text>
              </View>
            ))}
            <View style={[styles.kv, styles.totalRow]}>
              <Text style={styles.k}>Total</Text>
              <Text style={styles.total}>{formatCurrency(invoice.totalAmount, invoice.currency)}</Text>
            </View>
            <View style={styles.kv}>
              <Text style={styles.k}>Paid</Text>
              <Text style={styles.v}>{formatCurrency(invoice.amountPaid, invoice.currency)}</Text>
            </View>
            <View style={styles.kv}>
              <Text style={styles.k}>Outstanding</Text>
              <Text style={[styles.v, styles.danger]}>
                {formatCurrency(Math.max(0, invoice.totalAmount - invoice.amountPaid), invoice.currency)}
              </Text>
            </View>
          </Card>

          {invoice.status === "DRAFT" ? (
            <Button title="Mark as sent" onPress={() => setStatus("SENT")} />
          ) : null}
          {invoice.status === "SENT" || invoice.status === "OVERDUE" || invoice.status === "PARTIALLY_PAID" ? (
            <Button title="Record payment" onPress={() => setStatus("PAID")} />
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  number: { fontSize: 24, fontWeight: "800" },
  headRight: { flexDirection: "row", gap: 8 },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  k: { color: colors.muted, fontSize: 14 },
  v: { color: colors.text, fontSize: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: spacing.sm },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalRow: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  total: { fontSize: 18, fontWeight: "800", color: colors.text },
  danger: { color: colors.danger },
});
