import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/AppShell";
import { Card, Badge, Button, Field, EmptyState, Loading } from "../components/ui";
import { ListRow, Divider } from "../components/Row";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { colors, spacing } from "../lib/theme";

export default function Clients() {
  const [clients, setClients] = useState<any[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/clients");
      setClients(res.clients);
    } catch {
      setClients([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addClient = async () => {
    if (!name.trim()) { setError("Client business name is required."); return; }
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/clients", {
        name: name.trim(),
        contactName: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        billingAddress: billingAddress.trim() || null,
        notes: null,
        tags: [],
      });
      setShowAdd(false);
      setName(""); setContactName(""); setEmail(""); setPhone(""); setBillingAddress("");
      load();
    } catch (e: any) {
      setError(e?.message || "Could not add client.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Clients"
      action={
        <Button title="+ Add" onPress={() => setShowAdd(v => !v)} variant="primary" fullWidth={false} style={styles.addBtn} />
      }
    >
      {showAdd ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Add client</Text>
          <Field label="Business name" value={name} onChangeText={setName} placeholder="Acme Inc." />
          <Field label="Contact name" value={contactName} onChangeText={setContactName} placeholder="Jane Cooper" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Phone" value={phone} onChangeText={setPhone} />
          <Field label="Billing address" value={billingAddress} onChangeText={setBillingAddress} placeholder="123 Main St, San Francisco, CA" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Add client" onPress={addClient} loading={submitting} />
        </Card>
      ) : null}

      {clients === null ? <Loading /> : null}
      {clients && clients.length === 0 ? <EmptyState title="No clients yet" message="Add your first client to start invoicing." /> : null}

      {clients && clients.length > 0 ? (
        <Card padded={false}>
          {clients.map((c, i) => (
            <View key={c.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                title={c.name}
                subtitle={c.email || c.contactName || "No contact"}
                right={
                  <View style={styles.right}>
                    <Text style={styles.amount}>{formatCurrency(c.stats?.outstandingAmount)}</Text>
                    {c.stats?.overdueAmount > 0 ? <Badge label="Overdue" tone="danger" /> : null}
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
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: 8 },
  formCard: { marginBottom: spacing.lg, gap: spacing.sm },
  formTitle: { fontSize: 17, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  right: { alignItems: "flex-end", gap: 6 },
  amount: { fontSize: 15, fontWeight: "700" },
});
