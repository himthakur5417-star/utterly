import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/AppShell";
import { Card, Loading, StatCard, EmptyState, Badge, SectionHeader } from "../components/ui";
import { BarChart } from "../components/Chart";
import { ListRow, Divider } from "../components/Row";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatCurrency, formatDate, relativeDue } from "../lib/format";
import { colors, spacing } from "../lib/theme";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/dashboard/stats");
      setData(res);
    } catch {
      // keep last data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;
  const transactions = data?.recentTransactions || [];
  const upcoming = data?.upcomingDeadlines || [];
  const overdue = data?.overdueAlerts || [];

  return (
    <AppShell
      title="Dashboard"
      subtitle={user?.businessName || "Welcome back"}
      scroll
      contentContainerStyle={styles.content}
    >
      {loading && !data ? <Loading /> : null}

      {data ? (
        <>
          <View style={styles.statGrid}>
            <StatCard label="Collected" value={formatCurrency(s?.totalRevenueCollected)} tone="success" />
            <StatCard label="Outstanding" value={formatCurrency(s?.outstandingPayments)} tone="warning" />
            <StatCard label="Overdue" value={formatCurrency(s?.overdueAmount)} tone="danger" />
            <StatCard label="Recovery rate" value={`${s?.recoveryRate ?? 0}%`} tone="primary" />
          </View>

          <SectionHeader title="Monthly revenue" />
          <Card>
            <BarChart data={(data?.charts?.monthlyRevenue || []).map((m: any) => ({ label: m.label, value: m.revenue }))} color={colors.success} />
          </Card>

          {overdue.length > 0 ? (
            <>
              <SectionHeader title="Overdue alerts" />
              <Card padded={false}>
                {overdue.map((o: any, i: number) => (
                  <View key={o.id}>
                    {i > 0 ? <Divider /> : null}
                    <ListRow
                      title={`${o.number} · ${o.clientName}`}
                      subtitle={relativeDue(o.dueDate)}
                      right={
                        <View style={styles.right}>
                          <Text style={styles.amount}>{formatCurrency(o.amount)}</Text>
                          <Badge label="Overdue" tone="danger" />
                        </View>
                      }
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {upcoming.length > 0 ? (
            <>
              <SectionHeader title="Upcoming deadlines" />
              <Card padded={false}>
                {upcoming.map((u: any, i: number) => (
                  <View key={u.id}>
                    {i > 0 ? <Divider /> : null}
                    <ListRow
                      title={`${u.number} · ${u.clientName}`}
                      subtitle={relativeDue(u.dueDate)}
                      right={<Text style={styles.amount}>{formatCurrency(u.amount)}</Text>}
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <SectionHeader title="Recent transactions" />
          {transactions.length === 0 ? (
            <EmptyState title="No transactions yet" message="Payments will show here." />
          ) : (
            <Card padded={false}>
              {transactions.map((t: any, i: number) => (
                <View key={t.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    title={t.clientName}
                    subtitle={formatDate(t.paidAt)}
                    right={<Text style={[styles.amount, styles.success]}>{formatCurrency(t.amount)}</Text>}
                  />
                </View>
              ))}
            </Card>
          )}
        </>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  right: { alignItems: "flex-end", gap: 6 },
  amount: { fontSize: 15, fontWeight: "700", color: colors.text },
  success: { color: colors.success },
});
