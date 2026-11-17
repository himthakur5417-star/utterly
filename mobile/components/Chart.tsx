import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radius, spacing } from "../lib/theme";

/**
 * Tiny dependency-free bar chart. Renders a labelled row of bars sized
 * relative to the max value. Good enough for mobile dashboard/report views
 * without pulling in a charting library.
 */
export function BarChart({
  data,
  color = colors.primary,
  height = 96,
  style,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  style?: ViewStyle;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * (height - 24), 4);
          return (
            <View key={i} style={styles.col}>
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: i === data.length - 1 ? color : `${color}55` },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={i} style={styles.label} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  col: { flex: 1 },
  bar: {
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    minWidth: 8,
  },
  labels: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 6,
  },
  label: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    color: colors.muted,
    fontWeight: "600",
  },
});
