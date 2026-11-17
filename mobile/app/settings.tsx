import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/AppShell";
import { Card, Button, Badge } from "../components/ui";
import { ListRow, Divider } from "../components/Row";
import { useAuth } from "../lib/auth";
import { colors, spacing } from "../lib/theme";

export default function Settings() {
  const { user, signOut } = useAuth();

  return (
    <AppShell title="Settings">
      <Text style={styles.section}>Account</Text>
      <Card padded={false}>
        <ListRow title={user?.name || "—"} subtitle={user?.email} />
        <Divider />
        <ListRow title="Plan" right={<Badge label={user?.plan || "PROFESSIONAL"} tone="primary" />} />
        <Divider />
        <ListRow title="Business" subtitle={user?.businessName || "Not onboarded"} />
      </Card>

      <Text style={styles.section}>About</Text>
      <Card padded={false}>
        <ListRow title="Version" subtitle="1.0.0" />
        <Divider />
        <ListRow title="Demo account" subtitle="demo@utterly.app" />
      </Card>

      <View style={styles.actions}>
        <Button title="Log out" variant="danger" onPress={signOut} />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 8, marginTop: spacing.lg },
  actions: { marginTop: spacing.xl, gap: spacing.md },
});
