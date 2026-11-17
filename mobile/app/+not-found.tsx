import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Screen, Button } from "../components/ui";
import { typography } from "../lib/theme";

export default function NotFound() {
  return (
    <Screen style={styles.screen}>
      <View style={styles.inner}>
        <Text style={typography.h1}>Page not found</Text>
        <Link href="/dashboard" asChild>
          <Button title="Go to dashboard" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "center", padding: 24 },
  inner: { alignItems: "center", gap: 16 },
});
