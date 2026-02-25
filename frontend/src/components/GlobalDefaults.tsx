/**
 * GlobalDefaults — global sports/league subscription + team filter management.
 *
 * Collapsible card at the top of the Event Groups page. Manages:
 * - Non-soccer league selection (via LeaguePicker)
 * - Soccer configuration (via SoccerModeSelector)
 * - Template assignments (via TemplateAssignmentModal)
 * - Default team filter (include/exclude teams, playoff bypass)
 *
 * Explicit Save buttons — league changes trigger EPG regeneration.
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ChevronRight,
  ChevronDown,
  Save,
  Loader2,
  Layers,
  Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LeaguePicker } from "@/components/LeaguePicker"
import { SoccerModeSelector, type SoccerMode } from "@/components/SoccerModeSelector"
import { TemplateAssignmentModal } from "@/components/TemplateAssignmentModal"
import { TeamPicker } from "@/components/TeamPicker"
import { useSubscription, useUpdateSubscription, useSubscriptionTemplates } from "@/hooks/useSubscription"
import { useTeamFilterSettings, useUpdateTeamFilterSettings } from "@/hooks/useSettings"
import { getLeagues } from "@/api/teams"
import type { SoccerFollowedTeam } from "@/api/types"
import type { TeamFilterSettings } from "@/api/settings"

export function GlobalDefaults() {
  const [expanded, setExpanded] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  // Fetch subscription state from server
  const { data: subscription, isLoading: subLoading } = useSubscription()
  const { data: templatesData } = useSubscriptionTemplates()
  const updateMutation = useUpdateSubscription()

  // Fetch leagues for sport counting
  const { data: leaguesData } = useQuery({
    queryKey: ["leagues"],
    queryFn: () => getLeagues(),
  })
  const allLeagues = leaguesData?.leagues || []

  // Team filter settings
  const { data: teamFilterData } = useTeamFilterSettings()
  const updateTeamFilter = useUpdateTeamFilterSettings()

  // Local state for editing (synced from subscription on load)
  const [nonSoccerLeagues, setNonSoccerLeagues] = useState<string[]>([])
  const [soccerMode, setSoccerMode] = useState<SoccerMode>(null)
  const [soccerLeagues, setSoccerLeagues] = useState<string[]>([])
  const [followedTeams, setFollowedTeams] = useState<SoccerFollowedTeam[]>([])
  const [hasLocalChanges, setHasLocalChanges] = useState(false)

  // Team filter local state
  const [teamFilter, setTeamFilter] = useState<TeamFilterSettings>({
    enabled: true,
    include_teams: null,
    exclude_teams: null,
    mode: "include",
    bypass_filter_for_playoffs: false,
  })

  // Sync local state from server subscription
  useEffect(() => {
    if (!subscription) return

    // Split leagues into soccer vs non-soccer
    const soccer: string[] = []
    const nonSoccer: string[] = []
    for (const slug of subscription.leagues) {
      const league = allLeagues.find((l) => l.slug === slug)
      if (league?.sport?.toLowerCase() === "soccer") {
        soccer.push(slug)
      } else {
        nonSoccer.push(slug)
      }
    }

    setNonSoccerLeagues(nonSoccer)
    setSoccerLeagues(soccer)
    setSoccerMode(subscription.soccer_mode as SoccerMode)
    setFollowedTeams(subscription.soccer_followed_teams || [])
    setHasLocalChanges(false)
  }, [subscription, allLeagues])

  // Sync team filter state when data loads
  useEffect(() => {
    if (teamFilterData) {
      setTeamFilter(teamFilterData)
    }
  }, [teamFilterData])

  // Combined leagues for template modal and team picker
  const allSubscribedLeagues = useMemo(
    () => [...nonSoccerLeagues, ...soccerLeagues],
    [nonSoccerLeagues, soccerLeagues]
  )

  // Summary stats
  const sportCount = useMemo(() => {
    const sports = new Set<string>()
    for (const slug of allSubscribedLeagues) {
      const league = allLeagues.find((l) => l.slug === slug)
      if (league?.sport) sports.add(league.sport)
    }
    return sports.size
  }, [allSubscribedLeagues, allLeagues])

  const templateCount = templatesData?.templates?.length || 0

  // Team filter summary
  const teamFilterSummary = useMemo(() => {
    if (!teamFilter.enabled) return ""
    const count = teamFilter.mode === "include"
      ? (teamFilter.include_teams?.length ?? 0)
      : (teamFilter.exclude_teams?.length ?? 0)
    if (count === 0) return ""
    return `, ${count} team${count !== 1 ? "s" : ""} ${teamFilter.mode === "include" ? "included" : "excluded"}`
  }, [teamFilter])

  // Handle non-soccer league change
  const handleNonSoccerChange = useCallback((leagues: string[]) => {
    setNonSoccerLeagues(leagues)
    setHasLocalChanges(true)
  }, [])

  // Handle soccer league change
  const handleSoccerLeaguesChange = useCallback((leagues: string[]) => {
    setSoccerLeagues(leagues)
    setHasLocalChanges(true)
  }, [])

  // Handle soccer mode change
  const handleSoccerModeChange = useCallback((mode: SoccerMode) => {
    setSoccerMode(mode)
    setHasLocalChanges(true)
  }, [])

  // Handle followed teams change
  const handleFollowedTeamsChange = useCallback((teams: SoccerFollowedTeam[]) => {
    setFollowedTeams(teams)
    setHasLocalChanges(true)
  }, [])

  // Save subscription to server
  const handleSave = useCallback(() => {
    const combinedLeagues = [...nonSoccerLeagues, ...soccerLeagues]
    updateMutation.mutate(
      {
        leagues: combinedLeagues,
        soccer_mode: soccerMode,
        soccer_followed_teams: followedTeams.length > 0 ? followedTeams : null,
      },
      {
        onSuccess: () => {
          setHasLocalChanges(false)
          toast.success("Subscribed sports updated")
        },
        onError: () => {
          toast.error("Failed to update subscribed sports")
        },
      }
    )
  }, [nonSoccerLeagues, soccerLeagues, soccerMode, followedTeams, updateMutation])

  // Save team filter
  const handleSaveTeamFilter = useCallback(() => {
    updateTeamFilter.mutate({
      enabled: teamFilter.enabled,
      include_teams: teamFilter.include_teams,
      exclude_teams: teamFilter.exclude_teams,
      mode: teamFilter.mode,
      clear_include_teams: teamFilter.mode === "exclude" || !teamFilter.include_teams?.length,
      clear_exclude_teams: teamFilter.mode === "include" || !teamFilter.exclude_teams?.length,
      bypass_filter_for_playoffs: teamFilter.bypass_filter_for_playoffs,
    }, {
      onSuccess: () => toast.success("Default team filter saved"),
      onError: () => toast.error("Failed to save team filter"),
    })
  }, [teamFilter, updateTeamFilter])

  const summaryText = subLoading
    ? "Loading..."
    : allSubscribedLeagues.length === 0
    ? "No sports subscribed"
    : `${allSubscribedLeagues.length} league${allSubscribedLeagues.length !== 1 ? "s" : ""} across ${sportCount} sport${sportCount !== 1 ? "s" : ""}${templateCount > 0 ? `, ${templateCount} template rule${templateCount !== 1 ? "s" : ""}` : ""}${teamFilterSummary}`

  return (
    <>
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 rounded-t-lg"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle>Global Defaults</CardTitle>
              {!expanded && (
                <CardDescription className="mt-1">
                  {summaryText}
                </CardDescription>
              )}
              {expanded && (
                <CardDescription>
                  Configure default league subscriptions and team filtering for all event groups
                </CardDescription>
              )}
            </div>
            {hasLocalChanges && !expanded && (
              <span className="text-xs text-amber-500 font-medium">Unsaved changes</span>
            )}
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-6">
            {/* Non-Soccer Sports Section */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Non-Soccer Sports</Label>
              <LeaguePicker
                selectedLeagues={nonSoccerLeagues}
                onSelectionChange={handleNonSoccerChange}
                excludeSport="soccer"
                maxHeight="max-h-64"
                showSearch={true}
                showSelectedBadges={true}
                maxBadges={10}
              />
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Soccer Mode Section */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Soccer Leagues</Label>
              <SoccerModeSelector
                mode={soccerMode}
                onModeChange={handleSoccerModeChange}
                selectedLeagues={soccerLeagues}
                onLeaguesChange={handleSoccerLeaguesChange}
                followedTeams={followedTeams}
                onFollowedTeamsChange={handleFollowedTeamsChange}
              />
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Template Assignments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Template Assignments</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setTemplateModalOpen(true)
                  }}
                >
                  <Layers className="h-4 w-4 mr-1" />
                  Manage ({templateCount})
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Assign templates by sport or league. More specific matches take priority (league &gt; sport &gt; default).
              </p>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Save Button (subscription) */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {hasLocalChanges
                  ? "You have unsaved changes. Save to apply."
                  : "League changes trigger EPG regeneration on next run."}
              </p>
              <Button
                onClick={handleSave}
                disabled={!hasLocalChanges || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Default Team Filter Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Default Team Filter</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="team-filter-enabled" className="text-sm">
                    {teamFilter.enabled ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch
                    id="team-filter-enabled"
                    checked={teamFilter.enabled}
                    onCheckedChange={(checked) => {
                      setTeamFilter({ ...teamFilter, enabled: checked })
                    }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Global team filter applied to all event groups that don't have their own filter.
              </p>

              {/* Mode selector */}
              <div className="flex items-center gap-4">
                <Label>Filter Mode:</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="default-team-filter-mode"
                      value="include"
                      checked={teamFilter.mode === "include"}
                      onChange={() => setTeamFilter({ ...teamFilter, mode: "include" })}
                      className="accent-primary"
                    />
                    <span className="text-sm">Include only selected teams</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="default-team-filter-mode"
                      value="exclude"
                      checked={teamFilter.mode === "exclude"}
                      onChange={() => setTeamFilter({ ...teamFilter, mode: "exclude" })}
                      className="accent-primary"
                    />
                    <span className="text-sm">Exclude selected teams</span>
                  </label>
                </div>
              </div>

              {/* TeamPicker */}
              <TeamPicker
                leagues={allSubscribedLeagues}
                selectedTeams={
                  teamFilter.mode === "include"
                    ? (teamFilter.include_teams ?? [])
                    : (teamFilter.exclude_teams ?? [])
                }
                onSelectionChange={(teams) => {
                  if (teamFilter.mode === "include") {
                    setTeamFilter({ ...teamFilter, include_teams: teams, exclude_teams: [] })
                  } else {
                    setTeamFilter({ ...teamFilter, exclude_teams: teams, include_teams: [] })
                  }
                }}
                placeholder="Search teams to add to default filter..."
              />

              {/* Playoff bypass option */}
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <Checkbox
                  checked={teamFilter.bypass_filter_for_playoffs}
                  onCheckedChange={(checked) =>
                    setTeamFilter({ ...teamFilter, bypass_filter_for_playoffs: !!checked })
                  }
                />
                <span className="text-sm">
                  Include all playoff games (bypass team filter for postseason events)
                </span>
              </label>

              {/* Status message and Save button */}
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {!teamFilter.enabled
                      ? "Team filtering is disabled. All events will be matched."
                      : !(teamFilter.include_teams?.length || teamFilter.exclude_teams?.length)
                        ? "No teams selected. All events will be matched."
                        : teamFilter.mode === "include"
                          ? `Only events involving ${teamFilter.include_teams?.length} selected team(s) will be matched.`
                          : `Events involving ${teamFilter.exclude_teams?.length} selected team(s) will be excluded.`}
                  </p>
                  {teamFilter.enabled && (teamFilter.include_teams?.length || teamFilter.exclude_teams?.length) ? (
                    <p className="text-xs text-muted-foreground italic">
                      Filter only applies to leagues where you've made selections.
                    </p>
                  ) : null}
                </div>
                <Button
                  onClick={handleSaveTeamFilter}
                  disabled={updateTeamFilter.isPending}
                >
                  {updateTeamFilter.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Default Filter
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Template Assignment Modal */}
      <TemplateAssignmentModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        subscribedLeagues={allSubscribedLeagues}
      />
    </>
  )
}
