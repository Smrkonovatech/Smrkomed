"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Clock,
  ExternalLink,
  FileText,
  Headphones,
  Loader2,
  MessageSquareText,
  Pause,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AiOutboundCallDialog,
} from "@/components/voice/ai-outbound-call-dialog";
import {
  CallTranscriptDialog,
} from "@/components/voice/call-transcript-dialog";
import type { SarvamCallItem } from "@/app/api/ai/call-logs/route";

interface CallStats {
  totalCalls: number;
  connectedCalls: number;
  busyCalls: number;
  failedCalls: number;
  connectRate: string;
  avgDurationSeconds: number;
}

export default function AiCallLogsPage() {
  const [calls, setCalls] = useState<SarvamCallItem[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [days, setDays] = useState("30");

  // Modals
  const [selectedCallForTranscript, setSelectedCallForTranscript] = useState<SarvamCallItem | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const [outboundDialogOpen, setOutboundDialogOpen] = useState(false);
  const [dialTargetPhone, setDialTargetPhone] = useState("+91");
  const [dialTargetName, setDialTargetName] = useState("Patient");

  const [playingCall, setPlayingCall] = useState<SarvamCallItem | null>(null);

  const handleTogglePlayAudio = (call: SarvamCallItem) => {
    if (playingCall?.attempt_id === call.attempt_id) {
      setPlayingCall(null);
    } else {
      setPlayingCall(call);
    }
  };

  const loadCallLogs = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("days", days);
        params.set("limit", "100");
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`/api/ai/call-logs?${params.toString()}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to retrieve call logs.");
        }

        setCalls(data.items || []);
        setStats(data.stats || null);
        if (isManualRefresh) {
          toast.success("Call logs refreshed from Sarvam AI!");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error fetching call logs";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, statusFilter, search],
  );

  useEffect(() => {
    void loadCallLogs();
  }, [loadCallLogs]);

  const handleRedial = (phone: string, name?: string) => {
    setDialTargetPhone(phone);
    setDialTargetName(name || "Patient");
    setOutboundDialogOpen(true);
  };

  const handleOpenTranscript = (call: SarvamCallItem) => {
    setSelectedCallForTranscript(call);
    setTranscriptOpen(true);
  };

  const formatDuration = (sec: number) => {
    if (!sec || sec <= 0) return "0s";
    const mins = Math.floor(sec / 60);
    const remainingSecs = Math.round(sec % 60);
    if (mins === 0) return `${remainingSecs}s`;
    return `${mins}m ${remainingSecs}s`;
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: d.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return { date: iso, time: "" };
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        title="AI Voice Calls & Transcripts"
        subtitle="Live outbound call attempts, recordings, and multilingual transcripts from Sarvam AI."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Sarvam Samvaad AI · Active
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadCallLogs(true)}
              disabled={refreshing || loading}
              className="gap-1.5 text-xs h-9"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setDialTargetPhone("+91");
                setDialTargetName("Patient");
                setOutboundDialogOpen(true);
              }}
              className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <PhoneCall className="size-3.5" />
              Make AI Voice Call
            </Button>
          </div>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total Calls */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Dispatched</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <PhoneForwarded className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats ? stats.totalCalls : "—"}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            In the last {days} days
          </p>
        </div>

        {/* Connected Calls */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Connected</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Phone className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats ? stats.connectedCalls : "—"}
            </span>
            {stats && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                {stats.connectRate} connect rate
              </Badge>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Completed or active discussions
          </p>
        </div>

        {/* Busy / Unreached */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Busy / Unreached</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <PhoneMissed className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {stats ? stats.busyCalls : "—"}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            User busy, rejected, or no answer
          </p>
        </div>

        {/* Avg Duration */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Avg. Call Duration</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <Clock className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-teal-600 dark:text-teal-400">
            {stats ? formatDuration(stats.avgDurationSeconds) : "—"}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Across connected conversations
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface-card p-3 sm:p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by phone number, patient name, or notes..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Buttons */}
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
              {[
                { id: "all", label: "All" },
                { id: "connected", label: "Connected" },
                { id: "busy", label: "Busy" },
                { id: "failed", label: "Failed" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    statusFilter === tab.id
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Timeframe selector */}
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[125px] h-9 text-xs">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Call List / Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm">Fetching call logs from Sarvam AI...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <AlertCircle className="size-8 text-destructive mb-2" />
            <p className="text-sm font-semibold text-foreground">Could not load call logs</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadCallLogs(true)}
              className="mt-4 gap-1.5 text-xs"
            >
              <RefreshCw className="size-3.5" />
              Try Again
            </Button>
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <PhoneOff className="size-8 text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm font-semibold text-foreground">No call logs found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search || statusFilter !== "all"
                ? "No calls match your active search and filter criteria."
                : "No outbound calls have been recorded in this time period yet."}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setDialTargetPhone("+91");
                setDialTargetName("Patient");
                setOutboundDialogOpen(true);
              }}
              className="mt-4 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="size-3.5" />
              Initiate First AI Voice Call
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/30 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Patient / Contact</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Language</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Clinical Context</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {calls.map((call) => {
                  const isConnected =
                    call.connectivity_status === "connected" || call.duration_in_seconds > 0;
                  const isBusy = call.connectivity_status === "busy";
                  const isFailed =
                    call.connectivity_status === "failed" || call.connectivity_status === "no_answer";

                  const patientName = call.agent_variables?.user_name || "Valued Patient";
                  const phone = call.user_contact || call.user_contact_masked;
                  const dt = formatDateTime(call.attempted_at);
                  const hasTranscript =
                    call.interaction_id && call.interaction_id !== "NO_INTERACTION_ID";

                  return (
                    <tr
                      key={call.attempt_id}
                      className="transition-colors hover:bg-muted/30 group"
                    >
                      {/* Patient / Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                            {patientName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{patientName}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isConnected ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30 gap-1.5 text-[11px] font-medium">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Connected
                          </Badge>
                        ) : isBusy ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30 gap-1.5 text-[11px] font-medium">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            Busy / Declined
                          </Badge>
                        ) : isFailed ? (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/30 gap-1.5 text-[11px] font-medium">
                            <span className="size-1.5 rounded-full bg-rose-500" />
                            {call.connectivity_status === "no_answer" ? "No Answer" : "Failed"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] font-medium capitalize">
                            {call.connectivity_status}
                          </Badge>
                        )}
                        {call.ended_by && call.ended_by !== "NO_END_REASON" ? (
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            {call.ended_by === "USER_ENDS" ? "Ended by user" : call.ended_by === "AGENT_ENDS" ? "Ended by AI" : call.ended_by}
                          </span>
                        ) : null}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-3 font-mono font-medium text-foreground whitespace-nowrap">
                        {formatDuration(call.duration_in_seconds)}
                      </td>

                      {/* Language */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <Badge variant="secondary" className="text-[10px] bg-muted font-normal">
                          {call.language_name && call.language_name !== "UNKNOWN"
                            ? call.language_name
                            : "Multilingual"}
                        </Badge>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="block font-medium text-foreground">{dt.date}</span>
                        <span className="block text-[10px] text-muted-foreground">{dt.time}</span>
                      </td>

                      {/* Clinical Context */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <p className="truncate text-muted-foreground text-[11px]" title={call.agent_variables?.call_summary || ""}>
                          {call.agent_variables?.call_summary || "Automated care follow-up call"}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Transcript Button */}
                          {hasTranscript ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenTranscript(call)}
                              className="h-8 text-xs gap-1.5 border-teal-300 text-teal-800 bg-teal-50/50 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 font-medium"
                            >
                              <MessageSquareText className="size-3.5" />
                              Transcript
                              {call.num_messages > 0 ? (
                                <span className="size-4 rounded-full bg-teal-200 dark:bg-teal-800 text-[10px] flex items-center justify-center font-mono">
                                  {call.num_messages}
                                </span>
                              ) : null}
                            </Button>
                          ) : null}

                          {/* In-Web Audio Playback Button */}
                          {call.interaction_id && call.interaction_id !== "NO_INTERACTION_ID" ? (
                            <Button
                              variant={playingCall?.attempt_id === call.attempt_id ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleTogglePlayAudio(call)}
                              className={`h-8 text-xs gap-1.5 font-medium transition-all ${
                                playingCall?.attempt_id === call.attempt_id
                                  ? "bg-teal-600 text-white hover:bg-teal-700 shadow-xs ring-2 ring-teal-400/40"
                                  : "border-teal-300 text-teal-800 bg-teal-50/40 hover:bg-teal-100 hover:text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
                              }`}
                              title={playingCall?.attempt_id === call.attempt_id ? "Pause Audio" : "Play Recording in Web"}
                            >
                              {playingCall?.attempt_id === call.attempt_id ? (
                                <>
                                  <Pause className="size-3.5 fill-current" />
                                  <span className="hidden sm:inline">Playing</span>
                                </>
                              ) : (
                                <>
                                  <Play className="size-3.5 fill-current" />
                                  <span className="hidden sm:inline">Play</span>
                                </>
                              )}
                            </Button>
                          ) : null}

                          {/* Redial Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRedial(phone, patientName)}
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-emerald-600"
                            title="Call Patient Again"
                          >
                            <PhoneCall className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating In-Page Audio Player Bar */}
      {playingCall && playingCall.interaction_id && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-2xl z-40 rounded-2xl border border-teal-500/40 bg-card/95 backdrop-blur-md p-3.5 shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
                <Volume2 className="size-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs truncate text-foreground">
                    {playingCall.agent_variables?.user_name || "Patient Call"}
                  </span>
                  <Badge variant="outline" className="text-[10px] py-0 border-teal-400 text-teal-700 dark:text-teal-300">
                    {formatDuration(playingCall.duration_in_seconds)}
                  </Badge>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground truncate">
                  {playingCall.user_contact || playingCall.user_contact_masked} · {playingCall.language_name || "Audio"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <audio
                key={playingCall.interaction_id}
                controls
                autoPlay
                className="h-8 max-w-xs sm:max-w-[280px] accent-teal-600"
                src={`/api/ai/call-logs/audio?interactionId=${encodeURIComponent(playingCall.interaction_id)}`}
              >
                Your browser does not support the audio element.
              </audio>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenTranscript(playingCall)}
                className="h-8 text-xs gap-1 border-teal-300 text-teal-800 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 shrink-0"
              >
                <MessageSquareText className="size-3.5" />
                <span className="hidden md:inline">Transcript</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPlayingCall(null)}
                className="size-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                title="Close Player"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Viewer Dialog */}
      <CallTranscriptDialog
        call={selectedCallForTranscript}
        open={transcriptOpen}
        onOpenChange={setTranscriptOpen}
        onRedial={handleRedial}
      />

      {/* Outbound AI Call Dialog */}
      <AiOutboundCallDialog
        open={outboundDialogOpen}
        onOpenChange={setOutboundDialogOpen}
        patientName={dialTargetName}
        phoneNumber={dialTargetPhone}
        treatment="IVF Care"
        stage="Consultation"
        doctorName="Dr. Ananya Rao"
        clinicName="Hospex"
      />
    </div>
  );
}
