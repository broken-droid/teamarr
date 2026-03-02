import {
  CheckCircle,
  XCircle,
  Ban,
  Loader2,
  Clock,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDateFormat } from "@/hooks/useDateFormat"
import type { ProcessingRun } from "@/api/epg"

function formatDuration(ms: number | null): string {
  if (!ms) return "-"
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function formatBytes(bytes: number | undefined | null): string {
  if (bytes == null || isNaN(bytes) || bytes === 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />
    case "cancelled":
      return <Ban className="h-4 w-4 text-orange-500" />
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

interface RunHistoryTableProps {
  runs: ProcessingRun[]
  onMatchedClick?: (runId: number) => void
  onFailedClick?: (runId: number) => void
}

export function RunHistoryTable({ runs, onMatchedClick, onFailedClick }: RunHistoryTableProps) {
  const { formatDateTime } = useDateFormat()

  return (
    <TooltipProvider delayDuration={300}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">Status</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-center">Processed</TableHead>
            <TableHead className="text-center">Programmes</TableHead>
            <TableHead className="text-center">Matched</TableHead>
            <TableHead className="text-center">Failed</TableHead>
            <TableHead className="text-center">Channels</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const teams = (run.extra_metrics?.teams_processed as number) ?? 0
            const groups = (run.extra_metrics?.groups_processed as number) ?? 0
            const events = run.programmes?.events ?? 0
            const pregame = run.programmes?.pregame ?? 0
            const postgame = run.programmes?.postgame ?? 0
            const idle = run.programmes?.idle ?? 0
            const total = run.programmes?.total ?? 0
            const matched = run.streams?.matched ?? 0
            const unmatched = run.streams?.unmatched ?? 0

            return (
              <TableRow key={run.id}>
                <TableCell>
                  <StatusIcon status={run.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(run.started_at)}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-muted-foreground text-xs">
                    {teams}T / {groups}G
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default tabular-nums">{total}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-0.5 text-xs">
                        <div>{events} events</div>
                        <div>{pregame} pregame</div>
                        <div>{postgame} postgame</div>
                        <div>{idle} idle</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  {onMatchedClick ? (
                    <button
                      className="text-green-600 hover:underline font-medium"
                      onClick={() => onMatchedClick(run.id)}
                    >
                      {matched}
                    </button>
                  ) : (
                    <span className="text-green-600 font-medium">{matched}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {onFailedClick ? (
                    <button
                      className="text-red-600 hover:underline font-medium"
                      onClick={() => onFailedClick(run.id)}
                    >
                      {unmatched}
                    </button>
                  ) : (
                    <span className="text-red-600 font-medium">{unmatched}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{run.channels?.active ?? 0}</TableCell>
                <TableCell>{formatDuration(run.duration_ms)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatBytes(run.xmltv_size_bytes)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}
