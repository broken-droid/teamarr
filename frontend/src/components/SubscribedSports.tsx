/**
 * SubscribedSports — global sports/league subscription management.
 *
 * Collapsible card at the top of the Event Groups page. Manages:
 * - Non-soccer league selection (via LeaguePicker)
 * - Soccer configuration (via SoccerModeSelector)
 * - Template assignments (via TemplateAssignmentModal)
 *
 * Explicit Save button — league changes trigger EPG regeneration.
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
import { Label } from "@/components/ui/label"
import { LeaguePicker } from "@/components/LeaguePicker"
import { SoccerModeSelector, type SoccerMode } from "@/components/SoccerModeSelector"
import { TemplateAssignmentModal } from "@/components/TemplateAssignmentModal"
import { useSubscription, useUpdateSubscription, useSubscriptionTemplates } from "@/hooks/useSubscription"
import { getLeagues } from "@/api/teams"
import type { SoccerFollowedTeam } from "@/api/types"

export function SubscribedSports() {
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

  // Local state for editing (synced from subscription on load)
  const [nonSoccerLeagues, setNonSoccerLeagues] = useState<string[]>([])
  const [soccerMode, setSoccerMode] = useState<SoccerMode>(null)
  const [soccerLeagues, setSoccerLeagues] = useState<string[]>([])
  const [followedTeams, setFollowedTeams] = useState<SoccerFollowedTeam[]>([])
  const [hasLocalChanges, setHasLocalChanges] = useState(false)

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

  // Combined leagues for template modal
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

  // Save to server
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

  const summaryText = subLoading
    ? "Loading..."
    : allSubscribedLeagues.length === 0
    ? "No sports subscribed"
    : `${allSubscribedLeagues.length} league${allSubscribedLeagues.length !== 1 ? "s" : ""} across ${sportCount} sport${sportCount !== 1 ? "s" : ""}${templateCount > 0 ? `, ${templateCount} template rule${templateCount !== 1 ? "s" : ""}` : ""}`

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
              <CardTitle>Subscribed Sports</CardTitle>
              {!expanded && (
                <CardDescription className="mt-1">
                  {summaryText}
                </CardDescription>
              )}
              {expanded && (
                <CardDescription>
                  Configure which leagues and sports to match across all event groups
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

            {/* Save Button */}
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
