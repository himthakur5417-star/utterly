import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Screen, Button } from "../components/ui";
import { colors, radius, spacing, typography } from "../lib/theme";

export default function Welcome() {
  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>U</Text>
        </View>
        <Text style={styles.title}>Utterly</Text>
        <Text style={styles.tagline}>
          AI Invoice & Payment Recovery
        </Text>
        <Text style={styles.sub}>
          Get paid faster with intelligent invoicing and an AI-powered recovery
          engine that follows up for you.
        </Text>
      </View>

      <View style={styles.actions}>
        <Link href="/login" asChild>
          <Button title="Log in" variant="primary" />
        </Link>
        <Link href="/signup" asChild>
          <Button title="Create free account" variant="secondary" />
        </Link>
        <Text style={styles.hint}>
          Use the demo account: demo@utterly.app
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "space-between" },
  content: { alignItems: "center", paddingTop: spacing.xxl * 2 },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  logoText: { color: "#FFF", fontSize: 36, fontWeight: "800" },
  title: { ...typography.h1, fontSize: 34, marginBottom: 6 },
  tagline: { ...typography.h3, color: colors.primary, marginBottom: spacing.md },
  sub: {
    ...typography.bodyMuted,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
  },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
  hint: {
    ...typography.caption,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
