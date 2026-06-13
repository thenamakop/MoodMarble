import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  MOODS,
  MOOD_COLORS,
  MOOD_LABELS,
  type MoodSubmission,
  MoodSubmissionSchema,
  TAGS,
  type MoodValue,
  type TagValue,
} from "@/contracts/mood-submission";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  Colors,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { submitMoodSubmission } from "@/features/mood-submission/api";
import { SubmissionConfirmation } from "@/features/mood-submission/submission-confirmation";
import { useTheme } from "@/hooks/use-theme";

const MAX_NOTE_LENGTH = 120;
const MAX_TAGS = 2;

interface MarbleTrayScreenProps {
  workspaceId?: string;
  teamId?: string;
  deviceJwt?: string;
  onSubmitMood?: (payload: MoodSubmission, deviceJwt: string) => Promise<void>;
  getCurrentHour?: () => number;
}

export function MarbleTrayScreen({
  workspaceId,
  teamId,
  deviceJwt,
  onSubmitMood = submitMoodSubmission,
  getCurrentHour = () => new Date().getHours(),
}: MarbleTrayScreenProps) {
  const theme = useTheme();
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [selectedTags, setSelectedTags] = useState<TagValue[]>([]);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationMood, setConfirmationMood] = useState<MoodValue | null>(
    null,
  );

  const hasSubmissionContext = Boolean(workspaceId && teamId && deviceJwt);
  const canSubmit =
    Boolean(selectedMood) && hasSubmissionContext && !isSubmitting;
  const selectedMoodLabel = selectedMood ? MOOD_LABELS[selectedMood] : null;

  const safeBottomPadding = useMemo(() => {
    if (Platform.OS === "web") {
      return Spacing.five;
    }

    return BottomTabInset + Spacing.four;
  }, []);

  const handleDismissConfirmation = useCallback(() => {
    setConfirmationMood(null);
  }, []);

  function toggleTag(tag: TagValue) {
    setSelectedTags((currentTags) => {
      if (currentTags.includes(tag)) {
        setErrorMessage(null);
        return currentTags.filter((currentTag) => currentTag !== tag);
      }

      if (currentTags.length >= MAX_TAGS) {
        setErrorMessage("Choose up to 2 tags.");
        return currentTags;
      }

      setErrorMessage(null);
      return [...currentTags, tag];
    });
  }

  function handleNoteChange(nextNote: string) {
    setErrorMessage(null);
    setNote(nextNote.slice(0, MAX_NOTE_LENGTH));
  }

  async function handleSubmit() {
    if (!selectedMood || !workspaceId || !teamId || !deviceJwt) {
      setErrorMessage("Submission is not ready yet.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setConfirmationMood(null);

    try {
      const submittedMood = selectedMood;
      const payload = MoodSubmissionSchema.parse({
        workspace_id: workspaceId,
        team_id: teamId,
        mood_type: submittedMood,
        tags: selectedTags,
        note: note.trim() || undefined,
        hour_of_day: getCurrentHour(),
      });

      await onSubmitMood(payload, deviceJwt);

      setSelectedMood(null);
      setSelectedTags([]);
      setNote("");
      setConfirmationMood(submittedMood);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Daily mood submission limit reached."
      ) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to submit mood right now.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <SubmissionConfirmation
        mood={confirmationMood}
        onDismiss={handleDismissConfirmation}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: safeBottomPadding },
          ]}
        >
          <View style={styles.heroSection}>
            <ThemedText type="title" style={styles.title}>
              Drop one marble
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Share a private snapshot of your day. No names. No public feed.
              Just one anonymous signal.
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Pick a mood
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {selectedMoodLabel
                  ? `Selected: ${selectedMoodLabel}`
                  : "Choose 1 of 9 marbles"}
              </ThemedText>
            </View>

            <View style={styles.marbleGrid}>
              {MOODS.map((mood) => {
                const isSelected = selectedMood === mood;

                return (
                  <Pressable
                    key={mood}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      setErrorMessage(null);
                      setConfirmationMood(null);
                      setSelectedMood(mood);
                    }}
                    style={({ pressed }) => [
                      styles.marblePressable,
                      {
                        opacity: pressed ? 0.85 : 1,
                        borderColor: isSelected ? theme.text : "transparent",
                      },
                    ]}
                    testID={`mood-${mood}`}
                  >
                    <View
                      style={[
                        styles.marbleCircle,
                        { backgroundColor: MOOD_COLORS[mood] },
                      ]}
                    />
                    <ThemedText type="smallBold" style={styles.marbleLabel}>
                      {MOOD_LABELS[mood]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Add context
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {selectedTags.length} of {MAX_TAGS} tags selected
              </ThemedText>
            </View>

            <View style={styles.tagWrap}>
              {TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);

                return (
                  <Pressable
                    key={tag}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      setConfirmationMood(null);
                      toggleTag(tag);
                    }}
                    style={({ pressed }) => [
                      styles.tagChip,
                      {
                        opacity: pressed ? 0.85 : 1,
                        backgroundColor: isSelected
                          ? theme.backgroundSelected
                          : theme.background,
                        borderColor: isSelected
                          ? theme.text
                          : theme.backgroundSelected,
                      },
                    ]}
                    testID={`tag-${tag}`}
                  >
                    <ThemedText type="smallBold">{tag}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Optional note
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {note.length} / {MAX_NOTE_LENGTH}
              </ThemedText>
            </View>

            <TextInput
              accessibilityLabel="Optional note"
              maxLength={MAX_NOTE_LENGTH}
              multiline
              onChangeText={handleNoteChange}
              placeholder="Add a short note if it helps."
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.noteInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                },
              ]}
              testID="note-input"
              value={note}
            />
            <ThemedText themeColor="textSecondary">
              Notes stay short and are hashed before storage.
            </ThemedText>
          </ThemedView>

          <View style={styles.feedbackArea}>
            {errorMessage ? (
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: canSubmit
                  ? theme.text
                  : theme.backgroundSelected,
                opacity: pressed && canSubmit ? 0.9 : 1,
              },
            ]}
            testID="submit-button"
          >
            {isSubmitting ? (
              <View style={styles.submitLoading}>
                <ActivityIndicator color={theme.background} />
                <ThemedText
                  style={[styles.submitLabel, { color: theme.background }]}
                >
                  Sharing...
                </ThemedText>
              </View>
            ) : (
              <ThemedText
                style={[styles.submitLabel, { color: theme.background }]}
              >
                Share marble
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  heroSection: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
  },
  subtitle: {
    maxWidth: 540,
  },
  panel: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  sectionHeader: {
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  marbleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  marblePressable: {
    width: "30%",
    minWidth: 92,
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderWidth: 2,
    borderRadius: Spacing.three,
  },
  marbleCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  marbleLabel: {
    textAlign: "center",
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  noteInput: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    textAlignVertical: "top",
    fontSize: 16,
    lineHeight: 22,
  },
  feedbackArea: {
    minHeight: 24,
    justifyContent: "center",
  },
  errorText: {
    color: Colors.light.textSecondary,
  },
  submitButton: {
    minHeight: 56,
    borderRadius: Spacing.four,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
  },
  submitLabel: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 700,
  },
  submitLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
});
