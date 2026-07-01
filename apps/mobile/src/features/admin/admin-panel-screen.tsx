import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { ScrollView as ScrollViewType } from "react-native";
import { Link } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { clearAdminSession } from "./session";

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
  managerCodes?: {
    id: string;
    code: string;
    team_name: string;
    expires_at: string;
    status: "active" | "used" | "expired" | "revoked";
  }[];
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
  onCreateWorkspace?: (input: { bootstrapSecret: string; name: string }) => void | Promise<void>;
  onExport?: (input: { endDate: string; startDate: string }) => void | Promise<void>;
  onGenerateManagerCode?: (teamId: string) => void | Promise<void>;
  onReturnHome?: () => void;
  onRevokeManagerCode?: (codeId: string) => void | Promise<void>;
  onRotateJoinCode?: () => void | Promise<void>;
  onRetry?: () => void;
  onUpdateTeam?: (input: { name: string; teamId: string }) => void | Promise<void>;
}

const SECTION_ORDER: {
  focus: AdminSectionFocus;
  label: string;
}[] = [
  { focus: "overview", label: "Overview" },
  { focus: "workspace", label: "Workspace" },
  { focus: "team", label: "Teams" },
  { focus: "join-code", label: "Join code" },
  { focus: "manager-codes", label: "Manager codes" },
  { focus: "export", label: "Export" },
];

/**
 * Renders the admin panel screen with section navigation, status panels, and workspace management actions.
 *
 * @param contentState - Controls which admin state panel or content layout is shown.
 * @param feedbackState - Optional feedback banner to display above the content.
 * @param isActionPending - Disables actions while a workspace operation is in progress.
 * @param sectionFocus - Initial section focus for the navigation chips and scroll position.
 * @param viewModel - Current admin data used to populate workspace, team, join code, and manager code content.
 * @param onCopyJoinCode - Called with the current join code when the copy action is pressed.
 * @param onCreateTeam - Called with the trimmed team name when a new team is created.
 * @param onCreateWorkspace - Called with the trimmed workspace name and bootstrap secret when a workspace is created.
 * @param onExport - Called with the trimmed export date range when an export is run.
 * @param onGenerateManagerCode - Called with a team ID to generate a manager code for that team.
 * @param onReturnHome - Called when the user leaves the admin panel or uses the guarded-state return action.
 * @param onRevokeManagerCode - Called with a manager code ID to revoke that code.
 * @param onRotateJoinCode - Called to refresh the workspace join code.
 * @param onRetry - Called when retrying from the error state.
 * @param onUpdateTeam - Called with the selected team ID and trimmed name when a team is renamed.
 */
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
  onGenerateManagerCode,
  onReturnHome,
  onRevokeManagerCode,
  onRotateJoinCode,
  onRetry,
  onUpdateTeam,
}: AdminPanelScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollViewType>(null);
  const sectionOffsetsRef = useRef<Partial<Record<AdminSectionFocus, number>>>({});
  const [activeFocus, setActiveFocus] = useState<AdminSectionFocus>(sectionFocus);
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState("");
  const [bootstrapSecretDraft, setBootstrapSecretDraft] = useState("");
  const [newTeamNameDraft, setNewTeamNameDraft] = useState("");
  const [renameTeamNameDraft, setRenameTeamNameDraft] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  function handleNavChipPress(focus: AdminSectionFocus) {
    setActiveFocus(focus);
    const y = sectionOffsetsRef.current[focus];
    if (y !== undefined) {
      scrollViewRef.current?.scrollTo({ y, animated: true });
    }
  }
  const workspaceName = viewModel?.workspaceName ?? t("admin.panel.noWorkspace");
  const workspaceId = viewModel?.workspaceId ?? t("admin.panel.workspaceIdPending");
  const joinCode = viewModel?.joinCode ?? t("admin.panel.joinCodeNotGenerated");
  const teams = viewModel?.teams ?? [];

  useEffect(() => {
    if (teams.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when teams list emptied externally
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
        ref={scrollViewRef}
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
                  <ThemedText type="smallBold">{t("admin.panel.kickerAdmin")}</ThemedText>
                </ThemedView>
                <ThemedView
                  style={[
                    styles.kickerPill,
                    {
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                >
                  <ThemedText type="smallBold">{t("admin.panel.kickerShell")}</ThemedText>
                </ThemedView>
              </View>

              <ThemedText type="title" style={styles.title}>
                {t("admin.panel.title")}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {t("admin.panel.subtitle")}
              </ThemedText>
            </View>

            <View style={styles.headerActionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  await clearAdminSession();
                  onReturnHome?.();
                }}
                style={({ pressed }) => [
                  styles.returnButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                testID="admin-panel-logout"
              >
                <ThemedText type="smallBold">{t("admin.panel.signOut")}</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.navRow}>
            {SECTION_ORDER.map((section) => (
              <Pressable
                key={section.focus}
                accessibilityRole="button"
                onPress={() => handleNavChipPress(section.focus)}
                testID={`admin-panel-nav-${section.focus}`}
              >
                {({ pressed }) => (
                  <ThemedView
                    style={[
                      styles.navChip,
                      {
                        backgroundColor:
                          section.focus === activeFocus
                            ? theme.backgroundSelected
                            : theme.backgroundElement,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                    type="backgroundElement"
                  >
                    <ThemedText type="smallBold">{section.label}</ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            ))}
          </View>

          <ThemedView
            style={styles.summaryPanel}
            testID="admin-panel-summary"
            type="backgroundElement"
          >
            <ThemedText type="smallBold">{t("admin.panel.overviewSummaryTitle")}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.summaryCopy}>
              {viewModel
                ? t("admin.panel.overviewSummaryWithWorkspace", {
                    workspaceName,
                    teamCount: teams.length,
                  })
                : t("admin.panel.overviewSummaryEmpty")}
            </ThemedText>
          </ThemedView>

          {feedbackState ? (
            <ThemedView
              style={[
                styles.feedbackBanner,
                {
                  backgroundColor:
                    feedbackState.kind === "success" ? "#D9F7E8" : theme.backgroundSelected,
                },
              ]}
              testID={`admin-panel-feedback-${feedbackState.kind}`}
            >
              <ThemedText type="smallBold">{feedbackState.message}</ThemedText>
            </ThemedView>
          ) : null}

          {contentState.kind === "guarded" ? (
            <StatePanel
              body={t("admin.panel.states.guarded.body")}
              title={t("admin.panel.states.guarded.title")}
              testID="admin-panel-guarded-state"
            >
              <View style={styles.guardedActionRow}>
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
                  <ThemedText type="smallBold">
                    {t("admin.panel.states.guarded.returnButton")}
                  </ThemedText>
                </Pressable>

                <Link href="/admin-login" asChild>
                  <Pressable
                    accessibilityRole="button"
                    style={[
                      styles.stateButton,
                      {
                        backgroundColor: "#208AEF",
                      },
                    ]}
                    testID="admin-panel-guarded-login"
                  >
                    <ThemedText type="smallBold" style={styles.primaryButtonText}>
                      {t("admin.panel.states.guarded.loginButton")}
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>

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
              body={t("admin.panel.states.loading.body")}
              title={t("admin.panel.states.loading.title")}
              testID="admin-panel-loading-state"
            >
              <ActivityIndicator color={theme.text} />
            </StatePanel>
          ) : null}

          {contentState.kind === "empty" ? (
            <StatePanel
              body={t("admin.panel.states.empty.body")}
              title={t("admin.panel.states.empty.title")}
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
              title={t("admin.panel.states.error.title")}
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
                <ThemedText type="smallBold">
                  {t("admin.panel.states.error.retryButton")}
                </ThemedText>
              </Pressable>
            </StatePanel>
          ) : null}

          {contentState.kind === "ready" ? (
            <View style={styles.readyLayout} testID="admin-panel-ready-state">
              <AdminSectionCard
                body={t("admin.panel.sections.workspace.body")}
                focus="workspace"
                isActive={activeFocus === "workspace" || activeFocus === "overview"}
                onLayout={(y) => {
                  sectionOffsetsRef.current.workspace = y;
                }}
                testID="admin-panel-workspace-section"
                title={t("admin.panel.sections.workspace.title")}
              >
                <DetailRow
                  label={t("admin.panel.sections.workspace.nameLabel")}
                  value={workspaceName}
                />
                <DetailRow
                  label={t("admin.panel.sections.workspace.idLabel")}
                  value={workspaceId}
                />
                <ThemedText themeColor="textSecondary" style={styles.sectionCopy}>
                  {t("admin.panel.sections.workspace.creationNote")}
                </ThemedText>
              </AdminSectionCard>

              <AdminSectionCard
                body={t("admin.panel.sections.team.body")}
                focus="team"
                isActive={activeFocus === "team"}
                onLayout={(y) => {
                  sectionOffsetsRef.current.team = y;
                }}
                testID="admin-panel-team-section"
                title={t("admin.panel.sections.team.title")}
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
                  <ThemedText testID="admin-panel-team-empty-copy" themeColor="textSecondary">
                    {t("admin.panel.sections.team.emptyTeams")}
                  </ThemedText>
                )}
                <View style={styles.formBlock}>
                  <ThemedText type="smallBold">
                    {t("admin.panel.sections.team.addTeamTitle")}
                  </ThemedText>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    onChangeText={setNewTeamNameDraft}
                    placeholder={t("admin.panel.sections.team.addTeamPlaceholder")}
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
                    disabled={isActionPending || newTeamNameDraft.trim().length === 0}
                    label={
                      isActionPending
                        ? t("common.saving")
                        : t("admin.panel.sections.team.createTeamButton")
                    }
                    onPress={() => {
                      void onCreateTeam?.(newTeamNameDraft.trim());
                    }}
                    testID="admin-panel-create-team"
                    theme={theme}
                  />
                </View>
                <View style={styles.formBlock}>
                  <ThemedText type="smallBold">
                    {t("admin.panel.sections.team.renameTeamTitle")}
                  </ThemedText>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={Boolean(selectedTeam)}
                    onChangeText={setRenameTeamNameDraft}
                    placeholder={t("admin.panel.sections.team.renameTeamPlaceholder")}
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
                      isActionPending || !selectedTeam || renameTeamNameDraft.trim().length === 0
                    }
                    label={
                      isActionPending
                        ? t("common.saving")
                        : t("admin.panel.sections.team.renameTeamButton")
                    }
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
                body={t("admin.panel.sections.joinCode.body")}
                focus="join-code"
                isActive={activeFocus === "join-code"}
                onLayout={(y) => {
                  sectionOffsetsRef.current["join-code"] = y;
                }}
                testID="admin-panel-join-code-section"
                title={t("admin.panel.sections.joinCode.title")}
              >
                <DetailRow
                  label={t("admin.panel.sections.joinCode.activeCodeLabel")}
                  value={joinCode}
                />
                <View style={styles.actionRow}>
                  <ActionButton
                    disabled={isActionPending || !viewModel?.joinCode}
                    label={
                      isActionPending
                        ? t("common.working")
                        : t("admin.panel.sections.joinCode.copyButton")
                    }
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
                    label={
                      isActionPending
                        ? t("common.working")
                        : t("admin.panel.sections.joinCode.refreshButton")
                    }
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
                body={t("admin.panel.sections.managerCodes.body")}
                focus="manager-codes"
                isActive={activeFocus === "manager-codes"}
                onLayout={(y) => {
                  sectionOffsetsRef.current["manager-codes"] = y;
                }}
                testID="admin-panel-manager-codes-section"
                title={t("admin.panel.sections.managerCodes.title")}
              >
                {teams.length === 0 ? (
                  <ThemedText themeColor="textSecondary" type="small">
                    {t("admin.panel.sections.managerCodes.noTeamsNotice")}
                  </ThemedText>
                ) : (
                  <>
                    {teams.map((team) => (
                      <View key={team.id} style={styles.managerCodeTeamRow}>
                        <ThemedText type="smallBold">{team.name}</ThemedText>
                        <ActionButton
                          disabled={isActionPending}
                          label={
                            isActionPending
                              ? t("common.working")
                              : t("admin.panel.sections.managerCodes.generateButton")
                          }
                          onPress={() => {
                            void onGenerateManagerCode?.(team.id);
                          }}
                          testID={`admin-panel-generate-code-${team.id}`}
                          theme={theme}
                        />
                      </View>
                    ))}
                    {(viewModel?.managerCodes ?? []).length > 0 && (
                      <View style={styles.managerCodeList}>
                        {(viewModel?.managerCodes ?? []).map((mc) => (
                          <View
                            key={mc.id}
                            style={styles.managerCodeItem}
                            testID={`manager-code-item-${mc.id}`}
                          >
                            <ThemedText style={styles.managerCodeText}>{mc.code}</ThemedText>
                            <ThemedText themeColor="textSecondary" type="small">
                              {mc.team_name} · {mc.status}
                            </ThemedText>
                            {mc.status === "active" && (
                              <ActionButton
                                disabled={isActionPending}
                                label={t("admin.panel.sections.managerCodes.revokeButton")}
                                onPress={() => {
                                  void onRevokeManagerCode?.(mc.id);
                                }}
                                testID={`admin-panel-revoke-code-${mc.id}`}
                                theme={theme}
                              />
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </AdminSectionCard>

              <AdminSectionCard
                body={t("admin.panel.sections.export.body")}
                focus="export"
                isActive={activeFocus === "export"}
                onLayout={(y) => {
                  sectionOffsetsRef.current.export = y;
                }}
                testID="admin-panel-export-section"
                title={t("admin.panel.sections.export.title")}
              >
                <ThemedText themeColor="textSecondary" style={styles.sectionCopy}>
                  {t("admin.panel.sections.export.note")}
                </ThemedText>
                <View style={styles.formBlock}>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setExportStartDate}
                    placeholder={t("admin.panel.sections.export.startDatePlaceholder")}
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
                    placeholder={t("admin.panel.sections.export.endDatePlaceholder")}
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
                    label={
                      isActionPending ? "Preparing..." : t("admin.panel.sections.export.runButton")
                    }
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

/**
 * Renders a panel for an admin screen state.
 *
 * @param title - The panel title text.
 * @param body - The supporting message text.
 * @param testID - The test identifier for the panel.
 * @param children - Additional content to render below the message.
 */
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
    <ThemedView style={styles.statePanel} testID={testID} type="backgroundElement">
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

/**
 * Renders a section card with a header, focus pill, and content area.
 *
 * @param title - Section title text.
 * @param body - Section description text.
 * @param testID - Test identifier for the card container.
 * @param isActive - Whether the section is currently selected.
 * @param focus - Section focus label shown in the pill.
 * @param onLayout - Called with the card's vertical offset after layout.
 */
function AdminSectionCard({
  title,
  body,
  testID,
  isActive,
  focus,
  onLayout,
  children,
}: {
  title: string;
  body: string;
  testID: string;
  isActive: boolean;
  focus: AdminSectionFocus;
  onLayout?: (y: number) => void;
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
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
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
          <ThemedText style={isActive ? styles.activeFocusText : undefined} type="smallBold">
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

/**
 * Renders the workspace creation form.
 *
 * @param workspaceNameDraft - Current workspace name input value.
 * @param bootstrapSecretDraft - Current bootstrap secret input value.
 * @param isActionPending - Whether workspace creation is in progress.
 * @param onChangeWorkspaceName - Handles workspace name text changes.
 * @param onChangeBootstrapSecret - Handles bootstrap secret text changes.
 * @param onCreateWorkspace - Called with the trimmed workspace name and bootstrap secret when the form is submitted.
 * @param theme - Theme values used to style the inputs and button.
 */
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
  onCreateWorkspace?: (input: { bootstrapSecret: string; name: string }) => void | Promise<void>;
  theme: ReturnType<typeof useTheme>;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.formBlock}>
      <ThemedText type="smallBold">{t("admin.panel.workspaceSetup.title")}</ThemedText>
      <TextInput
        autoCapitalize="words"
        autoCorrect={false}
        onChangeText={onChangeWorkspaceName}
        placeholder={t("admin.panel.workspaceSetup.namePlaceholder")}
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
        placeholder={t("admin.panel.workspaceSetup.secretPlaceholder")}
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
        label={
          isActionPending
            ? t("admin.panel.workspaceSetup.creatingButton")
            : t("admin.panel.workspaceSetup.createButton")
        }
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

/**
 * Renders a themed action button.
 *
 * @param label - The button label.
 * @param onPress - The function to call when the button is pressed.
 * @param disabled - Whether the button is disabled.
 * @param testID - The test identifier.
 * @param theme - The active theme.
 * @param variant - The visual style to apply.
 */
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
          borderColor: variant === "primary" ? "#208AEF" : theme.backgroundSelected,
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

export type { AdminPanelContentState, AdminPanelScreenProps, AdminPanelViewModel };

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
  headerActionRow: {
    flexDirection: "row",
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
  guardedActionRow: {
    flexDirection: "row",
    gap: Spacing.two,
    marginBottom: Spacing.two,
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
  managerCodeTeamRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
  managerCodeList: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  managerCodeItem: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  managerCodeText: {
    fontFamily: "monospace",
    fontSize: 14,
    letterSpacing: 2,
  },
});
