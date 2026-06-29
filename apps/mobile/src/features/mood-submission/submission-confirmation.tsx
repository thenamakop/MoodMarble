import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import type { MoodValue } from "@/contracts/mood-submission";
import { MOOD_COLORS, MOOD_LABELS } from "@/contracts/mood-submission";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";

export const CONFIRMATION_AUTO_DISMISS_MS = 2000;
const ANIMATIONS_ENABLED = process.env.NODE_ENV !== "test";

interface SubmissionConfirmationProps {
  mood: MoodValue | null;
  onDismiss: () => void;
}

export function SubmissionConfirmation({
  mood,
  onDismiss,
}: SubmissionConfirmationProps) {
  const [dropTranslateY] = useState(
    () => new Animated.Value(ANIMATIONS_ENABLED ? -120 : 0),
  );
  const [dropScale] = useState(
    () => new Animated.Value(ANIMATIONS_ENABLED ? 0.75 : 1),
  );
  const [fadeOpacity] = useState(
    () => new Animated.Value(ANIMATIONS_ENABLED ? 0 : 1),
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mood) {
      return;
    }

    if (!ANIMATIONS_ENABLED) {
      timeoutRef.current = setTimeout(() => {
        onDismiss();
      }, CONFIRMATION_AUTO_DISMISS_MS);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }

    dropTranslateY.setValue(-120);
    dropScale.setValue(0.75);
    fadeOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(fadeOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(dropTranslateY, {
          toValue: 16,
          duration: 340,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(dropTranslateY, {
          toValue: 0,
          damping: 12,
          stiffness: 180,
          mass: 0.85,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(dropScale, {
          toValue: 1.05,
          duration: 340,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(dropScale, {
          toValue: 1,
          damping: 12,
          stiffness: 180,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      onDismiss();
    }, CONFIRMATION_AUTO_DISMISS_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [dropScale, dropTranslateY, fadeOpacity, mood, onDismiss]);

  if (!mood) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onDismiss}
      style={styles.overlay}
      testID="submission-confirmation"
    >
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeOpacity,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: fadeOpacity,
            transform: [{ translateY: dropTranslateY }, { scale: dropScale }],
          },
        ]}
      >
        <ThemedView type="backgroundElement" style={styles.card}>
          <View
            style={[styles.marble, { backgroundColor: MOOD_COLORS[mood] }]}
          />

          <ThemedText type="subtitle" style={styles.title}>
            Marble shared anonymously.
          </ThemedText>
          <ThemedText style={styles.message} themeColor="textSecondary">
            {MOOD_LABELS[mood]} has been dropped into the tray. Thank you for
            checking in.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Tap anywhere to close
          </ThemedText>
        </ThemedView>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
  },
  cardWrapper: {
    width: "100%",
    paddingHorizontal: Spacing.four,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.two,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  marble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
  },
});
