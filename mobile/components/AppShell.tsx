import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  ViewStyle,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors, radius, spacing, typography } from "../lib/theme";

const TABS = [
  { key: "/dashboard", label: "Home", active: "home" },
  { key: "/invoices", label: "Invoices", active: "file-text" },
  { key: "/recovery", label: "Recovery", active: "brain" },
  { key: "/clients", label: "Clients", active: "users" },
  { key: "/settings", label: "Settings", active: "settings" },
] as const;

function Icon({ name, color }: { name: string; color: string }) {
  const glyphs: Record<string, string> = {
    home: "⌂",
    "file-text": "▤",
    brain: "◉",
    users: "⊕",
    settings: "⚙",
  };
  return <Text style={[styles.icon, { color }]}>{glyphs[name] || "•"}</Text>;
}

export function AppShell({
  title,
  subtitle,
  action,
  children,
  scroll = true,
  contentContainerStyle,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>

      {inner}

      <View style={styles.tabbar}>
        {TABS.map((tab) => {
          const active = pathname === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => router.push(tab.key as never)}
              style={styles.tab}
            >
              <Icon name={tab.active} color={active ? colors.primary : colors.muted} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1 },
  title: { ...typography.h1 },
  subtitle: { ...typography.caption, color: colors.muted, marginTop: 2 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tab: { flex: 1, alignItems: "center", gap: 2 },
  icon: { fontSize: 20, lineHeight: 24 },
  tabLabel: { fontSize: 11, fontWeight: "600", color: colors.muted },
  tabLabelActive: { color: colors.primary },
});
