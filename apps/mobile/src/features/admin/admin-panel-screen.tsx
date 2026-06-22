import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { AdminSectionFocus } from "./route-state";

type AdminPanelContentState =
  | { kind: "guarded" }
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

interface AdminPanelViewModel {
  workspaceId: string;
  workspaceName: string | null;
  joinCode: string | null;
  teamNames: string[];
}

interface AdminPanelScreenProps {
  contentState?: AdminPanelContentState;
  sectionFocus?: AdminSectionFocus;
  viewModel?: AdminPanelViewModel | null;
  onReturnHome?: () => void;
  onRetry?: () => void;
}

const SECTION_ORDER: Array<{
  focus: AdminSectionFocus;
  label: string;
}> = [
  { focus: "overview", label: "Overview" },
  { focus: "workspace", label: "Workspace" },
  { focus: "team", label: "Teams" },
  { focus: "join-code", label: "Join code" },
  { focus: "export", label: "Export" },
];

export function AdminPanelScreen({
  contentState = { kind: "ready" },
  sectionFocus = "overview",
  viewModel = null,
  onReturnHome,
  onRetry,
}: AdminPanelScreenProps) {
  const theme = useTheme();
  const workspaceName = viewModel?.workspaceName ?? "No workspace connected";
  const workspaceId = viewModel?.workspaceId ?? "Pending";
  const joinCode = viewModel?.joinCode ?? "Not generated yet";
  const teamNames = viewModel?.teamNames ?? [];

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        testID="admin-panel-screen"
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <View style={styles.kickerRow}>
                <ThemedView
                  style={[
                    styles.kickerPill,
                    {
                      backgroundColor: theme.backgroundSelected,
                    },
                  ]}
                >
                  <ThemedText type="smallBold">Admin only</ThemedText>
                </ThemedView>
                <ThemedView
                  style={[
                    styles.kickerPill,
                    {
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                >
                  <ThemedText type="smallBold">Week 7 shell</ThemedText>
                </ThemedView>
              </View>

              <ThemedText type="title" style={styles.title}>
                Admin control panel
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Prepare workspace setup, team management, join-code sharing, and
                anonymous CSV export without touching member or manager flows.
              </ThemedText>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={onReturnHome}
              style={({ pressed }) => [
                styles.returnButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID="admin-panel-return-home"
            >
              <ThemedText type="smallBold">Return to app</ThemedText>
            </Pressable>
          </View>

          <View style={styles.navRow}>
            {SECTION_ORDER.map((section) => (
              <ThemedView
                key={section.focus}
                style={[
                  styles.navChip,
                  {
                    backgroundColor:
                      section.focus === sectionFocus
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                  },
                ]}
                testID={`admin-panel-nav-${section.focus}`}
                type="backgroundElement"
              >
                <ThemedText type="smallBold">{section.label}</ThemedText>
              </ThemedView>
            ))}
          </View>

          <ThemedView
            style={styles.summaryPanel}
            testID="admin-panel-summary"
            type="backgroundElement"
          >
            <ThemedText type="smallBold">Panel overview</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.summaryCopy}>
              {viewModel
                ? `Workspace: ${workspaceName}. Teams ready: ${teamNames.length}. Join code visibility stays admin-only.`
                : "Use this admin shell to prepare workspace setup, teams, join codes, and exports before wiring live actions."}
            </ThemedText>
          </ThemedView>

          {contentState.kind === "guarded" ? (
            <StatePanel
              body="Open this route with workspace-scoped admin access. Anonymous member and manager sessions cannot use the admin panel."
              title="Admin access required"
              testID="admin-panel-guarded-state"
            >
              <Pressable
                accessibilityRole="button"
                onPress={onReturnHome}
                style={[
                  styles.stateButton,
                  {
                    backgroundColor: theme.backgroundSelected,
                  },
                ]}
                testID="admin-panel-guarded-return-home"
              >
                <ThemedText type="smallBold">Return to app</ThemedText>
              </Pressable>
            </StatePanel>
          ) : null}

          {contentState.kind === "loading" ? (
            <StatePanel
              body="Preparing workspace controls, team placeholders, join-code preview, and export actions."
              title="Loading admin panel"
              testID="admin-panel-loading-state"
            >
              <ActivityIndicator color={theme.text} />
            </StatePanel>
          ) : null}

          {contentState.kind === "empty" ? (
            <StatePanel
              body="No admin workspace details are available yet. Start with workspace creation, then add teams and generate a join code."
              title="Admin setup is empty"
              testID="admin-panel-empty-state"
            />
          ) : null}

          {contentState.kind === "error" ? (
            <StatePanel
              body={contentState.message}
              title="Admin panel unavailable"
              testID="admin-panel-error-state"
            >
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                style={[
                  styles.stateButton,
                  {
                    backgroundColor: theme.backgroundSelected,
                  },
                ]}
                testID="admin-panel-retry"
              >
                <ThemedText type="smallBold">Retry shell</ThemedText>
              </Pressable>
            </StatePanel>
          ) : null}

          {contentState.kind === "ready" ? (
            <View style={styles.readyLayout} testID="admin-panel-ready-state">
              <AdminSectionCard
                body="Set up the workspace name and keep the admin shell scoped to one organization at a time."
                focus="workspace"
                isActive={
                  sectionFocus === "workspace" || sectionFocus === "overview"
                }
                testID="admin-panel-workspace-section"
                title="Workspace"
              >
                <DetailRow label="Workspace name" value={workspaceName} />
                <DetailRow label="Workspace ID" value={workspaceId} />
                <PlaceholderAction
                  label="Create workspace"
                  status="Backend ready"
                  testID="admin-panel-workspace-action"
                />
              </AdminSectionCard>

              <AdminSectionCard
                body="Create, rename, and review team groups without exposing member identities."
                focus="team"
                isActive={sectionFocus === "team"}
                testID="admin-panel-team-section"
                title="Team management"
              >
                {teamNames.length > 0 ? (
                  <View style={styles.teamChipRow}>
                    {teamNames.map((teamName) => (
                      <ThemedView
                        key={teamName}
                        style={styles.teamChip}
                        type="background"
                      >
                        <ThemedText type="smallBold">{teamName}</ThemedText>
                      </ThemedView>
                    ))}
                  </View>
                ) : (
                  <ThemedText
                    testID="admin-panel-team-empty-copy"
                    themeColor="textSecondary"
                  >
                    No teams yet. Add the first team after workspace setup.
                  </ThemedText>
                )}
                <PlaceholderAction
                  label="Add or rename teams"
                  status="Wiring next"
                  testID="admin-panel-team-action"
                />
              </AdminSectionCard>

              <AdminSectionCard
                body="View the active join code and keep member entry anonymous."
                focus="join-code"
                isActive={sectionFocus === "join-code"}
                testID="admin-panel-join-code-section"
                title="Join code"
              >
                <DetailRow label="Active code" value={joinCode} />
                <PlaceholderAction
                  label="Copy or rotate code"
                  status={
                    viewModel?.joinCode ? "Ready to wire" : "Pending workspace"
                  }
                  testID="admin-panel-join-code-action"
                />
              </AdminSectionCard>

              <AdminSectionCard
                body="Trigger anonymized CSV export without revealing raw notes, device tokens, or member identities."
                focus="export"
                isActive={sectionFocus === "export"}
                testID="admin-panel-export-section"
                title="Export"
              >
                <ThemedText
                  themeColor="textSecondary"
                  style={styles.sectionCopy}
                >
                  Export range and download wiring will stay admin-only and
                  reuse the existing privacy-safe backend contract.
                </ThemedText>
                <PlaceholderAction
                  label="Download CSV"
                  status="Backend ready"
                  testID="admin-panel-export-action"
                />
              </AdminSectionCard>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function StatePanel({
  title,
  body,
  testID,
  children,
}: {
  title: string;
  body: string;
  testID: string;
  children?: React.ReactNode;
}) {
  return (
    <ThemedView
      style={styles.statePanel}
      testID={testID}
      type="backgroundElement"
    >
      <ThemedText type="subtitle" style={styles.stateTitle}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.stateCopy}>
        {body}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

function AdminSectionCard({
  title,
  body,
  testID,
  isActive,
  focus,
  children,
}: {
  title: string;
  body: string;
  testID: string;
  isActive: boolean;
  focus: AdminSectionFocus;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <ThemedView
      style={[
        styles.sectionCard,
        {
          borderColor: isActive ? "#208AEF" : theme.backgroundSelected,
        },
      ]}
      testID={testID}
      type="backgroundElement"
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCopy}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.sectionCopy}>
            {body}
          </ThemedText>
        </View>
        <ThemedView
          style={[
            styles.sectionFocusPill,
            {
              backgroundColor: isActive ? "#208AEF" : theme.background,
            },
          ]}
        >
          <ThemedText
            style={isActive ? styles.activeFocusText : undefined}
            type="smallBold"
          >
            {focus === "join-code" ? "Join code" : focus}
          </ThemedText>
        </ThemedView>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </ThemedView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText themeColor="textSecondary">{value}</ThemedText>
    </View>
  );
}

function PlaceholderAction({
  label,
  status,
  testID,
}: {
  label: string;
  status: string;
  testID: string;
}) {
  const theme = useTheme();

  return (
    <ThemedView
      style={[
        styles.placeholderAction,
        {
          backgroundColor: theme.background,
          borderColor: theme.backgroundSelected,
        },
      ]}
      testID={testID}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText themeColor="textSecondary">{status}</ThemedText>
    </ThemedView>
  );
}

export type {
  AdminPanelContentState,
  AdminPanelScreenProps,
  AdminPanelViewModel,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  container: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.three,
  },
  headerCopy: {
    gap: Spacing.two,
  },
  kickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  kickerPill: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  title: {
    maxWidth: 720,
  },
  subtitle: {
    maxWidth: 720,
  },
  returnButton: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: "flex-start",
  },
  navRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  navChip: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  summaryPanel: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summaryCopy: {
    maxWidth: 720,
  },
  statePanel: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  stateTitle: {
    fontSize: 28,
    lineHeight: 36,
  },
  stateCopy: {
    maxWidth: 720,
  },
  stateButton: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: "flex-start",
  },
  readyLayout: {
    gap: Spacing.three,
  },
  sectionCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.three,
    alignItems: "flex-start",
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 36,
  },
  sectionCopy: {
    maxWidth: 680,
  },
  sectionFocusPill: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  activeFocusText: {
    color: "#ffffff",
  },
  sectionBody: {
    gap: Spacing.two,
  },
  detailRow: {
    gap: Spacing.one,
  },
  placeholderAction: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  teamChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  teamChip: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
