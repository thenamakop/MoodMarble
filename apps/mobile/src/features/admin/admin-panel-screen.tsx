import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { AdminSectionFocus } from "./route-state";
import type { AdminTeam } from "@/contracts/admin";

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
  teams: AdminTeam[];
}

interface AdminPanelScreenProps {
  contentState?: AdminPanelContentState;
  feedbackState?: {
    kind: "success" | "error";
    message: string;
  } | null;
  isActionPending?: boolean;
  sectionFocus?: AdminSectionFocus;
  viewModel?: AdminPanelViewModel | null;
  onCopyJoinCode?: (joinCode: string) => void | Promise<void>;
  onCreateTeam?: (name: string) => void | Promise<void>;
  onCreateWorkspace?: (input: {
    bootstrapSecret: string;
    name: string;
  }) => void | Promise<void>;
  onExport?: (input: {
    endDate: string;
    startDate: string;
  }) => void | Promise<void>;
  onReturnHome?: () => void;
  onRotateJoinCode?: () => void | Promise<void>;
  onRetry?: () => void;
  onUpdateTeam?: (input: {
    name: string;
    teamId: string;
  }) => void | Promise<void>;
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
  feedbackState = null,
  isActionPending = false,
  sectionFocus = "overview",
  viewModel = null,
  onCopyJoinCode,
  onCreateTeam,
  onCreateWorkspace,
  onExport,
  onReturnHome,
  onRotateJoinCode,
  onRetry,
  onUpdateTeam,
}: AdminPanelScreenProps) {
  const theme = useTheme();
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState("");
  const [bootstrapSecretDraft, setBootstrapSecretDraft] = useState("");
  const [newTeamNameDraft, setNewTeamNameDraft] = useState("");
  const [renameTeamNameDraft, setRenameTeamNameDraft] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const workspaceName = viewModel?.workspaceName ?? "No workspace connected";
  const workspaceId = viewModel?.workspaceId ?? "Pending";
  const joinCode = viewModel?.joinCode ?? "Not generated yet";
  const teams = viewModel?.teams ?? [];

  useEffect(() => {
    if (teams.length === 0) {
      setSelectedTeamId(null);
      setRenameTeamNameDraft("");
      return;
    }

    const currentTeam = teams.find((team) => team.id === selectedTeamId);

    if (currentTeam) {
      if (renameTeamNameDraft.trim().length === 0) {
        setRenameTeamNameDraft(currentTeam.name);
      }
      return;
    }

    const firstTeam = teams[0];
    setSelectedTeamId(firstTeam.id);
    setRenameTeamNameDraft(firstTeam.name);
  }, [renameTeamNameDraft, selectedTeamId, teams]);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

  function handleSelectTeam(team: AdminTeam) {
    setSelectedTeamId(team.id);
    setRenameTeamNameDraft(team.name);
  }

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
                ? `Workspace: ${workspaceName}. Teams ready: ${teams.length}. Join code visibility stays admin-only.`
                : "Use this admin shell to prepare workspace setup, teams, join codes, and exports before wiring live actions."}
            </ThemedText>
          </ThemedView>

          {feedbackState ? (
            <ThemedView
              style={[
                styles.feedbackBanner,
                {
                  backgroundColor:
                    feedbackState.kind === "success"
                      ? "#D9F7E8"
                      : theme.backgroundSelected,
                },
              ]}
              testID={`admin-panel-feedback-${feedbackState.kind}`}
            >
              <ThemedText type="smallBold">{feedbackState.message}</ThemedText>
            </ThemedView>
          ) : null}

          {contentState.kind === "guarded" ? (
            <StatePanel
              body="Open this route with workspace-scoped admin access or bootstrap a new workspace with the admin setup secret. Anonymous member and manager sessions cannot use admin data."
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

              <WorkspaceSetupForm
                bootstrapSecretDraft={bootstrapSecretDraft}
                isActionPending={isActionPending}
                onChangeBootstrapSecret={setBootstrapSecretDraft}
                onChangeWorkspaceName={setWorkspaceNameDraft}
                onCreateWorkspace={onCreateWorkspace}
                theme={theme}
                workspaceNameDraft={workspaceNameDraft}
              />
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
            >
              <WorkspaceSetupForm
                bootstrapSecretDraft={bootstrapSecretDraft}
                isActionPending={isActionPending}
                onChangeBootstrapSecret={setBootstrapSecretDraft}
                onChangeWorkspaceName={setWorkspaceNameDraft}
                onCreateWorkspace={onCreateWorkspace}
                theme={theme}
                workspaceNameDraft={workspaceNameDraft}
              />
            </StatePanel>
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
                <ThemedText
                  themeColor="textSecondary"
                  style={styles.sectionCopy}
                >
                  Workspace creation is available from the bootstrap panel. Once
                  created, this section stays focused on the active admin scope.
                </ThemedText>
              </AdminSectionCard>

              <AdminSectionCard
                body="Create, rename, and review team groups without exposing member identities."
                focus="team"
                isActive={sectionFocus === "team"}
                testID="admin-panel-team-section"
                title="Team management"
              >
                {teams.length > 0 ? (
                  <View style={styles.teamChipRow}>
                    {teams.map((team) => (
                      <Pressable
                        key={team.id}
                        accessibilityRole="button"
                        onPress={() => handleSelectTeam(team)}
                        style={({ pressed }) => [
                          styles.teamChipButton,
                          {
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                        testID={`admin-panel-select-team-${team.id}`}
                      >
                        <ThemedView
                          style={[
                            styles.teamChip,
                            {
                              backgroundColor:
                                selectedTeamId === team.id
                                  ? theme.backgroundSelected
                                  : theme.background,
                            },
                          ]}
                          type="background"
                        >
                          <ThemedText type="smallBold">{team.name}</ThemedText>
                        </ThemedView>
                      </Pressable>
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
                <View style={styles.formBlock}>
                  <ThemedText type="smallBold">Add team</ThemedText>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    onChangeText={setNewTeamNameDraft}
                    placeholder="Product"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                    testID="admin-panel-team-name-input"
                    value={newTeamNameDraft}
                  />
                  <ActionButton
                    disabled={
                      isActionPending || newTeamNameDraft.trim().length === 0
                    }
                    label={isActionPending ? "Saving..." : "Create team"}
                    onPress={() => {
                      void onCreateTeam?.(newTeamNameDraft.trim());
                    }}
                    testID="admin-panel-create-team"
                    theme={theme}
                  />
                </View>
                <View style={styles.formBlock}>
                  <ThemedText type="smallBold">Rename selected team</ThemedText>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={Boolean(selectedTeam)}
                    onChangeText={setRenameTeamNameDraft}
                    placeholder="Engineering"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                        opacity: selectedTeam ? 1 : 0.6,
                      },
                    ]}
                    testID="admin-panel-rename-team-input"
                    value={renameTeamNameDraft}
                  />
                  <ActionButton
                    disabled={
                      isActionPending ||
                      !selectedTeam ||
                      renameTeamNameDraft.trim().length === 0
                    }
                    label={isActionPending ? "Saving..." : "Rename team"}
                    onPress={() => {
                      if (!selectedTeam) {
                        return;
                      }

                      void onUpdateTeam?.({
                        teamId: selectedTeam.id,
                        name: renameTeamNameDraft.trim(),
                      });
                    }}
                    testID="admin-panel-rename-team"
                    theme={theme}
                  />
                </View>
              </AdminSectionCard>

              <AdminSectionCard
                body="View the active join code and keep member entry anonymous."
                focus="join-code"
                isActive={sectionFocus === "join-code"}
                testID="admin-panel-join-code-section"
                title="Join code"
              >
                <DetailRow label="Active code" value={joinCode} />
                <View style={styles.actionRow}>
                  <ActionButton
                    disabled={isActionPending || !viewModel?.joinCode}
                    label={isActionPending ? "Working..." : "Copy join code"}
                    onPress={() => {
                      if (!viewModel?.joinCode) {
                        return;
                      }

                      void onCopyJoinCode?.(viewModel.joinCode);
                    }}
                    testID="admin-panel-copy-join-code"
                    theme={theme}
                  />
                  <ActionButton
                    disabled={isActionPending || !viewModel?.workspaceId}
                    label={isActionPending ? "Working..." : "Refresh join code"}
                    onPress={() => {
                      void onRotateJoinCode?.();
                    }}
                    testID="admin-panel-refresh-join-code"
                    theme={theme}
                    variant="secondary"
                  />
                </View>
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
                <View style={styles.formBlock}>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setExportStartDate}
                    placeholder="2026-06-01"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                    testID="admin-panel-export-start-date"
                    value={exportStartDate}
                  />
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setExportEndDate}
                    placeholder="2026-06-30"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                    testID="admin-panel-export-end-date"
                    value={exportEndDate}
                  />
                  <ActionButton
                    disabled={
                      isActionPending ||
                      exportStartDate.trim().length === 0 ||
                      exportEndDate.trim().length === 0
                    }
                    label={isActionPending ? "Preparing..." : "Export CSV"}
                    onPress={() => {
                      void onExport?.({
                        startDate: exportStartDate.trim(),
                        endDate: exportEndDate.trim(),
                      });
                    }}
                    testID="admin-panel-export-run"
                    theme={theme}
                  />
                </View>
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

function WorkspaceSetupForm({
  workspaceNameDraft,
  bootstrapSecretDraft,
  isActionPending,
  onChangeWorkspaceName,
  onChangeBootstrapSecret,
  onCreateWorkspace,
  theme,
}: {
  workspaceNameDraft: string;
  bootstrapSecretDraft: string;
  isActionPending: boolean;
  onChangeWorkspaceName: (value: string) => void;
  onChangeBootstrapSecret: (value: string) => void;
  onCreateWorkspace?: (input: {
    bootstrapSecret: string;
    name: string;
  }) => void | Promise<void>;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.formBlock}>
      <ThemedText type="smallBold">Create workspace</ThemedText>
      <TextInput
        autoCapitalize="words"
        autoCorrect={false}
        onChangeText={onChangeWorkspaceName}
        placeholder="MoodMarble HQ"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.textInput,
          {
            backgroundColor: theme.background,
            borderColor: theme.backgroundSelected,
            color: theme.text,
          },
        ]}
        testID="admin-panel-workspace-name-input"
        value={workspaceNameDraft}
      />
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeBootstrapSecret}
        placeholder="Admin bootstrap secret"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        style={[
          styles.textInput,
          {
            backgroundColor: theme.background,
            borderColor: theme.backgroundSelected,
            color: theme.text,
          },
        ]}
        testID="admin-panel-bootstrap-secret-input"
        value={bootstrapSecretDraft}
      />
      <ActionButton
        disabled={
          isActionPending ||
          workspaceNameDraft.trim().length === 0 ||
          bootstrapSecretDraft.trim().length === 0
        }
        label={isActionPending ? "Creating..." : "Create workspace"}
        onPress={() => {
          void onCreateWorkspace?.({
            name: workspaceNameDraft.trim(),
            bootstrapSecret: bootstrapSecretDraft.trim(),
          });
        }}
        testID="admin-panel-create-workspace"
        theme={theme}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  testID,
  theme,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
  theme: ReturnType<typeof useTheme>;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: variant === "primary" ? "#208AEF" : theme.background,
          borderColor:
            variant === "primary" ? "#208AEF" : theme.backgroundSelected,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
      testID={testID}
    >
      <ThemedText
        style={variant === "primary" ? styles.primaryButtonText : undefined}
        type="smallBold"
      >
        {label}
      </ThemedText>
    </Pressable>
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
  feedbackBanner: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
  formBlock: {
    gap: Spacing.two,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  textInput: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 48,
  },
  actionButton: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: "flex-start",
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  teamChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  teamChipButton: {
    borderRadius: Spacing.five,
  },
  teamChip: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
