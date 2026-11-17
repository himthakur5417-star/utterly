import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppShell } from "../components/AppShell";
import { Card, Badge, EmptyState, Loading, Field, Button } from "../components/ui";
import { ListRow, Divider } from "../components/Row";
import { api } from "../lib/api";
import { formatCurrency, formatDate, relativeDue } from "../lib/format";
import { colors, spacing } from "../lib/theme";

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" | "primary" {
  switch (status) {
    case "PAID": return "success";
    case "OVERDUE": return "danger";
    case "PARTIALLY_PAID": return "warning";
    case "SENT": return "info";
    case "DRAFT": return "neutral";
    default: return "neutral";
  }
}
const statusLabel: Record<string, string> = {
  DRAFT: "Draft", SENT: "Sent", PAID: "Paid",
  PARTIALLY_PAID: "Partially paid", OVERDUE: "Overdue", CANCELLED: "Cancelled",
};

export default function Invoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[] | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [showCreate, setShowCreate] = useState(false);

  // create form state
  const [clientId, setClientId] = useState("");
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const q = filter === "ALL" ? "" : `?status=${filter}`;
      const res = await api.get(`/api/invoices${q}`);
      setInvoices(res.invoices);
    } catch {
      setInvoices([]);
    }
  }, [filter]);

  const loadClients = useCallback(async () => {
    try {
      const res = await api.get("/api/clients");
      setClients(res.clients);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadClients(); }, [loadClients]);

  const createInvoice = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/invoices", {
        clientId, number, issueDate, dueDate,
        discountPercent: 0, taxPercent: 0,
        items: [{ description: desc, quantity: parseFloat(qty) || 1, unitPrice: parseFloat(price) || 0 }],
      });
      setShowCreate(false);
      setDesc(""); setQty("1"); setPrice(""); setNumber("");
      load();
    } catch (e: any) {
      setError(e?.message || "Could not create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const filters = ["ALL", "SENT", "OVERDUE", "PAID", "DRAFT"];

  return (
    <AppShell
      title="Invoices"
      action={
        <Pressable onPress={() => setShowCreate(v => !v)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ New</Text>
        </Pressable>
      }
    >
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === "ALL" ? "All" : statusLabel[f] || f}
            </Text>
          </Pressable>
        ))}
      </View>

      {showCreate ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>New invoice</Text>
          <Field label="Invoice number" value={number} onChangeText={setNumber} placeholder="INV-001" />
          <Field label="Client" value={clientId} onChangeText={setClientId} placeholder="Client ID (from Clients tab)" />
          <Field label="Issue date (YYYY-MM-DD)" value={issueDate} onChangeText={setIssueDate} placeholder="2025-01-01" />
          <Field label="Due date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} placeholder="2025-02-01" />
          <Field label="Line item description" value={desc} onChangeText={setDesc} placeholder="Web design" />
          <View style={styles.qtyRow}>
            <View style={styles.flex}><Field label="Qty" value={qty} onChangeText={setQty} keyboardType="numeric" /></View>
            <View style={styles.flex}><Field label="Unit price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /></View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Create invoice" onPress={createInvoice} loading={submitting} />
        </Card>
      ) : null}

      {invoices === null ? <Loading /> : null}
      {invoices && invoices.length === 0 ? <EmptyState title="No invoices" message="Create your first invoice to get started." /> : null}

      {invoices && invoices.length > 0 ? (
        <Card padded={false}>
          {invoices.map((inv, i) => (
            <View key={inv.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                onPress={() => router.push(`/invoices/${inv.id}` as never)}
                title={`${inv.number}`}
                subtitle={`${inv.client?.name || "—"} · ${formatDate(inv.dueDate)}`}
                right={
                  <View style={styles.right}>
                    <Text style={styles.amount}>{formatCurrency(Math.max(0, inv.totalAmount - inv.amountPaid), inv.currency)}</Text>
                    <Badge label={statusLabel[inv.status] || inv.status} tone={statusTone(inv.status)} />
                  </View>
                }
              />
            </View>
          ))}
        </Card>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  chipTextActive: { color: "#FFF" },
  formCard: { marginBottom: spacing.lg, gap: spacing.sm },
  formTitle: { fontSize: 17, fontWeight: "700" },
  qtyRow: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  right: { alignItems: "flex-end", gap: 6 },
  amount: { fontSize: 15, fontWeight: "700", color: colors.text },
});
