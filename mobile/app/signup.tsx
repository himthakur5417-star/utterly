import React, { useState } from "react";
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { Screen, Field, Button } from "../components/ui";
import { useAuth } from "../lib/auth";
import { colors, spacing, typography } from "../lib/theme";

export default function Signup() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Please fill in all fields (password 8+ characters).");
      return;
    }
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (e: any) {
      setError(e?.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={typography.h1}>Create your account</Text>
          <Text style={styles.sub}>Start recovering payments with AI.</Text>

          <View style={styles.form}>
            <Field label="Name" value={name} onChangeText={setName} placeholder="Jane Cooper" />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@company.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 8 characters"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Create account" onPress={submit} loading={loading} />
            <Link href="/login" style={styles.link}>
              <Text style={styles.linkText}>Already have an account? Log in</Text>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.xxl * 2 },
  sub: { ...typography.bodyMuted, color: colors.muted, marginTop: 4, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  link: { alignItems: "center", padding: spacing.md },
  linkText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
});
