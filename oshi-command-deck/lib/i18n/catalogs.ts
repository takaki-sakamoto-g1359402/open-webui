export const catalogs = {
  en: {
    "app.name": "Oshi Command Deck",
    "app.shortName": "Command Deck",
    "app.tagline": "Unofficial livestream mission control",
    "app.description":
      "Unofficial mobile-first dashboard for source-backed livestream tracking.",
    "app.unofficial": "Unofficial fan tool",
    "app.notAffiliated":
      "Not affiliated with or endorsed by ANYCOLOR Inc. or NIJISANJI.",
    "aria.primaryNav": "Primary navigation",
    "aria.trustNav": "Trust navigation",
    "aria.mobileNav": "Mobile navigation",
    "nav.today": "Today",
    "nav.favorites": "Favorites",
    "nav.minecraft": "Minecraft",
    "nav.route": "Route",
    "nav.settings": "Settings",
    "nav.admin": "Admin",
    "nav.privacy": "Privacy",
    "nav.terms": "Terms",
    "nav.dataSources": "Data Sources",
    "nav.contact": "Contact / Takedown",
    "common.demo": "DEMO",
    "common.loading": "Loading",
    "common.empty": "Nothing to show",
    "common.error": "Could not load this panel",
    "common.retry": "Retry",
    "common.clear": "Clear",
    "common.clearAll": "Clear all",
    "common.save": "Save",
    "common.saved": "Saved",
    "common.enabled": "Enabled",
    "common.disabled": "Disabled",
    "common.unknown": "Unknown",
    "common.all": "All",
    "common.source": "Source",
    "common.sources": "Sources",
    "common.confidence": "Confidence",
    "common.lastChecked": "Last checked",
    "common.coverage": "Coverage",
    "common.health": "Health",
    "common.status": "Status",
    "common.category": "Category",
    "common.talent": "Talent",
    "common.branch": "Branch",
    "common.language": "Language",
    "common.favorite": "Favorite",
    "common.favorites": "Favorites",
    "common.alerts": "Alerts",
    "common.timezone": "Timezone",
    "common.locale": "Language",
    "common.localTime": "Local time",
    "common.originalTitle": "Original title",
    "common.collaborators": "Collaborators",
    "common.links": "Links",
    "common.manualEvidence": "Manual evidence",
    "common.manualEvidenceLabel": "Manual evidence: {label}",
    "common.reason": "Reason",
    "common.reasons": "Reasons",
    "common.archive": "Archive",
    "common.archived": "Archived",
    "common.unarchive": "Unarchive",
    "common.stale": "Stale",
    "common.offline": "Offline",
    "common.cached": "Cached",
    "common.install": "Install",
    "common.notAvailable": "Not available",
    "common.noneReported": "None reported",
    "common.providerError": "Provider error",
    "common.conflicts": "Conflicts",
    "common.provenance": "Provenance",
    "common.provenanceDetails": "Source evidence details",
    "common.sourceId": "Source ID",
    "common.fetchedAt": "Fetched",
    "common.fields": "Fields",
    "common.sourceUrl": "Source URL",
    "common.openSource": "Open source",
    "common.rawEvidence": "Evidence",
    "common.machineTranslation": "Machine translation",
    "common.adminRequired": "Admin access required",
    "locale.en": "English",
    "locale.ja": "Japanese",
    "status.scheduled": "Scheduled",
    "status.live": "Live",
    "status.ended": "Ended",
    "status.tbd": "TBD",
    "status.unverified": "Unverified",
    "category.chat": "Chat",
    "category.game": "Game",
    "category.minecraft": "Minecraft",
    "category.music": "Music",
    "category.collaboration": "Collaboration",
    "category.event": "Event",
    "category.other": "Other",
    "provider.youtube": "YouTube",
    "provider.x": "X",
    "provider.manual": "Manual",
    "provider.future": "Future",
    "provenance.field.title": "Title",
    "provenance.field.status": "Status",
    "provenance.field.scheduledStart": "Scheduled start",
    "provenance.field.context": "Context",
    "provenance.field.cancellation": "Cancellation",
    "provenance.field.collaborators": "Collaborators",
    "provenance.field.category": "Category",
    "visibility.public": "Public",
    "visibility.unlisted": "Unlisted",
    "visibility.unknown": "Unknown",
    "health.healthy": "Healthy",
    "health.degraded": "Degraded",
    "health.stale": "Stale",
    "health.missing_credentials": "Credentials missing",
    "health.disabled": "Disabled",
    "sourceHealth.coverage.rawEvidenceFallback":
      "Coverage detail is preserved as provider evidence; review the source details before trusting it.",
    "sourceHealth.coverage.demo.youtube.pending_config":
      "Demo fixtures are shown until a YouTube Data API key and channel registry are configured.",
    "sourceHealth.coverage.demo.x.official_api_disabled":
      "Official X API access is not configured. Scraping is disabled, so social context is unavailable.",
    "sourceHealth.coverage.manual.imports_require_corrections":
      "Manual imports are labeled and cannot override provider facts without correction records.",
    "sourceHealth.coverage.manual.demo_require_corrections":
      "Manual and demo entries are labeled and require correction records before overriding provider data.",
    "sourceHealth.coverage.future.adapter_pending":
      "Future providers must pass adapter, provenance, quota, and RLS review gates before activation.",
    "sourceHealth.coverage.youtube.demo_not_called":
      "Demo mode is active; the official YouTube Data API was not called.",
    "sourceHealth.coverage.youtube.missing_credentials":
      "YouTube credentials are missing, so only demo fixtures are available.",
    "sourceHealth.coverage.youtube.official_search":
      "Official YouTube Data API live/upcoming search across {channels} configured channels; max {maxResults} results per channel/event type.",
    "sourceHealth.coverage.youtube.official_search_stopped_early":
      "Official YouTube Data API live/upcoming search across {channels} configured channels; max {maxResults} results per channel/event type. The provider run stopped early for quota or rate-limit backoff.",
    "sourceHealth.coverage.youtube.cached":
      "Official YouTube API results are served from a {seconds}s cache window to reduce quota usage.",
    "sourceHealth.coverage.youtube.registry_error":
      "The YouTube channel registry is invalid. Fix registry code {code} before live ingestion.",
    "sourceHealth.coverage.youtube.registry_missing":
      "The YouTube channel registry is empty. Add verified public channel IDs before live ingestion.",
    "sourceHealth.coverage.x.demo_not_called":
      "Demo mode is active; the official X API was not called.",
    "sourceHealth.coverage.x.missing_credentials":
      "X credentials are missing. Scraping is disabled, so social context is unavailable.",
    "sourceHealth.coverage.x.official_search_ai_enabled":
      "Official X recent search across {handles} configured handles; no scraping. Deterministic parsing runs first and validated AI fallback is enabled.",
    "sourceHealth.coverage.x.official_search_ai_disabled":
      "Official X recent search across {handles} configured handles; no scraping. Deterministic parsing runs first and validated AI fallback is disabled.",
    "sourceHealth.coverage.x.official_search_ai_enabled_stopped_early":
      "Official X recent search across {handles} configured handles; no scraping. Deterministic parsing runs first and validated AI fallback is enabled. The provider run stopped early for quota or rate-limit backoff.",
    "sourceHealth.coverage.x.official_search_ai_disabled_stopped_early":
      "Official X recent search across {handles} configured handles; no scraping. Deterministic parsing runs first and validated AI fallback is disabled. The provider run stopped early for quota or rate-limit backoff.",
    "sourceHealth.coverage.x.registry_error":
      "The X handle registry is invalid. Fix registry code {code} before live ingestion.",
    "sourceHealth.coverage.x.registry_missing":
      "The X handle registry is empty. Add verified official handles before X ingestion.",
    "sourceHealth.coverage.provider.cooldown":
      "Provider calls are skipped until {retryAfterUtc} because a cooldown is active.",
    "sourceHealth.coverage.supabase.not_configured":
      "Supabase public read mode is not configured.",
    "sourceHealth.coverage.supabase.empty":
      "Supabase public read mode is configured but has no live events.",
    "sourceHealth.coverage.supabase.serving_public":
      "Supabase public read mode is serving canonical events and public source links.",
    "sourceHealth.coverage.supabase.read_failed":
      "Supabase public read failed; provider adapters were not called because Supabase read mode is selected.",
    "sourceHealth.coverage.offline.cached_snapshot":
      "A read-only cached snapshot is being shown. Treat schedule and source health as stale until refreshed.",
    "sourceHealth.error.providerMessage":
      "The provider returned an error. Review source evidence before trusting this result.",
    "sourceHealth.error.missing_credentials.youtube_data_api_key":
      "YOUTUBE_DATA_API_KEY is not configured.",
    "sourceHealth.error.missing_credentials.x_bearer_token":
      "X_BEARER_TOKEN is not configured.",
    "sourceHealth.error.provider.code": "Provider error code: {code}",
    "sourceHealth.error.provider.cooldown": "Provider cooldown is active until {retryAfterUtc}.",
    "sourceHealth.error.supabase.public_read_failed":
      "Supabase public read failed. Admins should review server logs and provider health.",
    "home.title": "Today command deck",
    "home.subtitle":
      "Chronological, source-backed livestream tracking with visible coverage limits.",
    "home.sourceHealth": "Source health",
    "home.sourceConfidence": "Source confidence for {source}",
    "home.filters": "Filters",
    "home.searchLabel": "Search streams",
    "home.searchPlaceholder": "Talent, title, category, collaborator",
    "home.favoriteOnly": "Favorites only",
    "home.noResults":
      "No stream matches the current filters. Clear filters or import a manual item.",
    "home.loadingText": "Checking fixture data and local preferences.",
    "home.errorText": "The local demo dataset could not be prepared.",
    "home.demoNotice":
      "Demo mode is active. No YouTube, X, or Supabase credentials are required.",
    "home.liveNotice":
      "Live API mode is active. Streams come from configured official provider APIs.",
    "home.degradedNotice":
      "Live API mode is partially degraded. Provider errors and stale labels are shown.",
    "home.offlineNotice":
      "Offline cache is active. Cached data may be stale until the app reconnects.",
    "favorites.title": "Favorites and alerts",
    "favorites.subtitle":
      "Store anonymous preferences locally and keep account sync extensible.",
    "favorites.talents": "Favorite talents",
    "favorites.types": "Favorite stream types",
    "favorites.languages": "Favorite languages",
    "favorites.languagesHelp":
      "Language preferences are saved locally and can trigger alerts when a stream matches.",
    "favorites.overlapTitle": "Overlap detector",
    "favorites.overlapEmpty": "No overlapping favorite streams in the current window.",
    "favorites.alertUpcoming": "Upcoming stream alerts",
    "favorites.alertLive": "Live-now alerts",
    "favorites.alertMinecraft": "Minecraft alerts",
    "favorites.alertCollaboration": "Collaboration alerts",
    "favorites.alertQueueTitle": "Alert queue",
    "favorites.alertQueueSubtitle":
      "Preview which streams match the enabled alert types before any push delivery runs.",
    "favorites.alertQueueEmpty":
      "No streams currently match the enabled alert types and favorite signals.",
    "favorites.alertPriority": "Priority",
    "favorites.pushTitle": "Web Push",
    "favorites.pushUnavailable":
      "VAPID is not configured. Alerts stay in-app and local for this demo.",
    "favorites.pushConfigured":
      "Web Push is available on this device, but delivery still depends on server-side VAPID and Supabase storage.",
    "favorites.pushEnable": "Enable push alerts",
    "favorites.pushDisable": "Disable push alerts",
    "favorites.pushDenied": "Browser notification permission was denied.",
    "favorites.pushSaving": "Saving push subscription",
    "favorites.pushUnsubscribing": "Disabling push subscription",
    "favorites.pushSaved": "Push alerts are ready on this device.",
    "favorites.pushUnsubscribed": "Push alerts are disabled on this device.",
    "favorites.pushNoSubscription": "No active push subscription was found on this device.",
    "favorites.pushDeviceChecking": "Checking this device's push subscription.",
    "favorites.pushDeviceUnsupported": "This browser cannot manage Web Push subscriptions.",
    "favorites.pushDeviceUnknown": "Could not confirm this device's push subscription state.",
    "favorites.pushDegraded": "Push subscription could not be stored; alerts stay local.",
    "favorites.pushDisableDegraded":
      "This device was unsubscribed locally, but server cleanup could not be confirmed.",
    "favorites.pushEnableError": "Could not enable push alerts.",
    "favorites.pushDisableError": "Could not disable push alerts on this device.",
    "alert.delivery.push_ready": "Push ready",
    "alert.delivery.local_only": "Local only",
    "alert.delivery.needs_review": "Review first",
    "alert.reason.live": "Live now",
    "alert.reason.upcoming": "Upcoming",
    "alert.reason.minecraft": "Minecraft",
    "alert.reason.collaboration": "Collaboration",
    "alert.reason.favorite_talent": "Favorite talent",
    "alert.reason.favorite_category": "Favorite type",
    "alert.reason.favorite_language": "Favorite language",
    "alert.reason.favorite_collaborator": "Favorite collaborator",
    "alert.reason.stale": "Stale source",
    "alert.reason.low_confidence": "Low confidence",
    "alert.reason.unverified": "Needs verification",
    "route.title": "Watch Route",
    "route.subtitle":
      "Recommendations use visible scoring only: favorites, status, overlaps, category, confidence, and staleness.",
    "route.archiveQueue": "Archive queue",
    "route.archiveHelp":
      "Archived items stay out of route scoring until you restore them.",
    "route.noItems": "No route candidates remain after archive and filters.",
    "route.evidence.minecraftAlertEnabled": "Minecraft alerts enabled",
    "route.evidence.minutes.one": "{count} minute",
    "route.evidence.minutes.other": "{count} minutes",
    "reason.live_now": "Currently live",
    "reason.favorite_talent": "Favorite talent",
    "reason.favorite_category": "Favorite category",
    "reason.minecraft_priority": "Minecraft priority",
    "reason.collaboration": "Collaboration signal",
    "reason.overlap": "Overlaps with another POV",
    "reason.starting_soon": "Starting soon",
    "reason.high_confidence": "High confidence",
    "reason.stale_penalty": "Stale data penalty",
    "reason.manual_correction": "Admin correction",
    "minecraft.title": "Minecraft sessions",
    "minecraft.subtitle":
      "POVs are grouped into explainable sessions with a list fallback for relationships.",
    "minecraft.sessions": "Sessions",
    "minecraft.relationships": "Relationship view",
    "minecraft.relationshipFallback": "Accessible relationship list",
    "minecraft.participants": "Participants",
    "minecraft.sessionStart": "Start",
    "minecraft.sessionEnd": "End",
    "minecraft.povCount": "POVs",
    "minecraft.sessionLinks": "Session source links",
    "minecraft.sessionConfidence": "Session confidence for {title}",
    "minecraft.noSessions": "No Minecraft sessions in the current demo window.",
    "settings.title": "Settings",
    "settings.subtitle":
      "Control locale, timezone, install behavior, offline labels, and privacy boundaries.",
    "settings.languageSelector": "Display language",
    "settings.referenceLocaleHelp":
      "Reference catalogs ship in English and Japanese. Other valid BCP 47 tags keep fallback copy while driving lang, direction, dates, numbers, and sorting.",
    "settings.localeTagLabel": "BCP 47 locale tag",
    "settings.localeTagPlaceholder": "e.g. ar-EG, fr-CA, en-US",
    "settings.localeTagHelp":
      "Invalid tags safely fall back to English. Valid RTL tags such as ar-EG switch the document direction without component changes.",
    "settings.saveLocale": "Save display locale",
    "settings.currentDirection": "Current direction",
    "settings.timezoneSelector": "Display timezone",
    "settings.timezoneHelp":
      "Times are stored in UTC and rendered in the selected IANA timezone.",
    "settings.timezoneTagLabel": "IANA timezone",
    "settings.timezoneTagPlaceholder": "e.g. Europe/Paris, America/Sao_Paulo",
    "settings.timezoneTagHelp":
      "Enter any valid IANA timezone. Invalid values safely fall back to Asia/Tokyo.",
    "settings.timezoneInvalidFallback":
      "That timezone was not recognized, so the display timezone fell back to Asia/Tokyo.",
    "settings.saveTimezone": "Save display timezone",
    "settings.browserDetected": "Browser detected",
    "settings.installTitle": "Install app",
    "settings.installHelp":
      "Install support depends on your browser. The app remains usable without installation.",
    "settings.installAction": "Install app",
    "settings.installAvailable": "Install prompt ready",
    "settings.installUnavailable": "Install prompt not available",
    "settings.installInstalling": "Waiting for browser choice",
    "settings.installAccepted": "Install accepted",
    "settings.installDismissed": "Install dismissed",
    "settings.installInstalled": "Installed",
    "settings.installFallback": "Browser controlled",
    "settings.offlineTitle": "Offline cache",
    "settings.offlineHelp":
      "Offline mode is read-only and labels cached data as stale when appropriate.",
    "settings.privacyTitle": "Anonymous preferences",
    "settings.privacyHelp":
      "Favorites and filters are stored locally in this MVP. Account sync can be added later.",
    "settings.rtlPreview": "RTL support",
    "settings.rtlHelp":
      "Layout direction is driven by locale metadata; ja/en render LTR by default.",
    "settings.desktopPreview": "Desktop UI coverage",
    "settings.desktopPreviewBody":
      "The layout supports mobile, macOS-class wide desktop, and Windows 1366px-class desktop without requiring different components.",
    "admin.title": "Protected admin console",
    "admin.subtitle":
      "Manage registry, provider IDs, aliases, corrections, confidence, and ingestion runs.",
    "admin.demoOnly":
      "This demo shows protected admin surfaces. Production writes must go through server routes with admin RBAC and audit logs.",
    "admin.talentRegistry": "Talent registry",
    "admin.ingestionRuns": "Ingestion runs",
    "admin.corrections": "Corrections",
    "admin.providerIds": "Provider IDs",
    "admin.registryManager": "Registry manager",
    "admin.registryHelp":
      "Read configured creator/provider rows and upsert provider IDs, handles, aliases, tags, confidence, and active state.",
    "admin.registrySource": "Registry source",
    "admin.provider": "Provider",
    "admin.providerItemId": "Provider ID / handle",
    "admin.displayName": "Display name",
    "admin.slug": "Slug",
    "admin.aliases": "Aliases",
    "admin.tags": "Tags",
    "admin.confidenceInput": "Confidence",
    "admin.active": "Active",
    "admin.refreshRegistry": "Refresh registry",
    "admin.saveRegistry": "Save registry row",
    "admin.registrySaved": "Registry row saved with audit log.",
    "admin.registryDegraded": "Supabase service credentials are missing; registry writes are skipped.",
    "admin.registryAdminRequired": "Admin session or bearer token is required to write registry rows.",
    "admin.providerExportTitle": "Provider config export",
    "admin.providerExportHelp":
      "Use active registry rows to prepare server-only YOUTUBE_CHANNELS_JSON and X_HANDLES_JSON values. Verify each provider ID against official sources before production use.",
    "admin.youtubeChannelsJson": "YOUTUBE_CHANNELS_JSON",
    "admin.xHandlesJson": "X_HANDLES_JSON",
    "admin.youtubeExportCount": "{count} YouTube rows",
    "admin.xExportCount": "{count} X rows",
    "admin.copyYoutubeConfig": "Copy YouTube JSON",
    "admin.copyXConfig": "Copy X JSON",
    "admin.providerExportCopied": "Provider config copied.",
    "admin.providerExportCopyFailed":
      "Clipboard is unavailable. Select the JSON text manually.",
    "admin.providerExportWarnings": "Export review warnings",
    "admin.providerExportWarningCount.one": "{count} warning",
    "admin.providerExportWarningCount.other": "{count} warnings",
    "admin.providerExportWarning.demo_row":
      "Demo provider IDs are for local fixtures only. Replace them with verified official IDs before production use.",
    "admin.providerExportWarning.low_confidence":
      "Confidence is {confidence}. Review source ownership before using this row for live ingestion.",
    "admin.providerExportWarning.ignored_provider":
      "This provider is not exported to YouTube or X environment JSON.",
    "admin.providerExportWarning.inactive_row":
      "Inactive rows are skipped from provider environment JSON.",
    "admin.providerExportWarning.missing_provider_id":
      "Provider ID or handle is missing, so this row cannot be exported.",
    "admin.runIngestion": "Run demo ingestion",
    "admin.manualImport": "Manual import",
    "admin.manualImportHelp":
      "Add a real schedule item locally when provider credentials are unavailable or a source needs review.",
    "admin.localImports": "Local manual imports",
    "admin.sourceUrl": "Source URL",
    "admin.titleLabel": "Stream title",
    "admin.titlePlaceholder": "Minecraft relay POV / 21:00 JST",
    "admin.scheduledLocal": "Scheduled local time",
    "admin.collaboratorsText": "Collaborators",
    "admin.collaboratorsPlaceholder": "Kuzuha, Elira Pendora",
    "admin.languagesText": "Languages",
    "admin.languagesPlaceholder": "ja, en",
    "admin.notes": "Evidence note",
    "admin.notesPlaceholder": "Announcement checked manually",
    "admin.sourceUrlPlaceholder": "https://www.youtube.com/watch?v=...",
    "admin.addManual": "Add manual stream",
    "admin.removeManual": "Remove",
    "admin.manualLocal": "Manual / local",
    "admin.manualSaved": "Manual stream saved locally.",
    "admin.noManualImports": "No local manual imports yet.",
    "admin.manualRequired":
      "Title, a selected talent, and either a source URL or evidence note are required.",
    "admin.runDryRun": "Run ingestion dry run",
    "admin.runDryRunHelp":
      "Calls the local server route. Without admin credentials it stays in demo mode and never writes.",
    "admin.running": "Running",
    "admin.runSucceeded": "Dry run finished",
    "admin.runFailed": "Dry run failed",
    "admin.runHistory": "Run history",
    "admin.refreshHistory": "Refresh history",
    "admin.historyFailed": "Run history failed",
    "admin.noRunHistory": "No ingestion run history is available yet.",
    "admin.historySource.demo": "Demo history",
    "admin.historySource.supabase": "Supabase history",
    "admin.registrySource.demo": "Demo registry",
    "admin.registrySource.supabase": "Supabase registry",
    "admin.mode": "Mode",
    "admin.ingestionMode.demo": "Demo",
    "admin.ingestionMode.live_api": "Live API",
    "admin.ingestionMode.mixed_degraded": "Mixed degraded",
    "admin.adapterResults": "Adapter results",
    "admin.streamsFound": "Streams found",
    "admin.requests": "Requests",
    "admin.quotaCost": "Quota cost",
    "admin.persistSkipped": "Database write skipped",
    "admin.loginTitle": "Admin sign in",
    "admin.loginSubtitle":
      "Use the server-side admin job token or a Supabase Auth admin account to unlock protected operations.",
    "admin.loginCardTitle": "Protected admin access",
    "admin.loginHelp":
      "The token is checked server-side and exchanged for a short-lived HTTP-only cookie.",
    "admin.loginToken": "Admin token",
    "admin.loginSubmit": "Unlock admin",
    "admin.loginSubmitting": "Checking token",
    "admin.loginFailed": "The admin token was not accepted.",
    "admin.loginDisabled": "Admin token protection is not configured in this environment.",
    "admin.loginSupabaseTitle": "Supabase admin account",
    "admin.loginSupabaseHelp":
      "Signs in with Supabase Auth, verifies admin_members server-side, then stores only an HTTP-only admin session cookie.",
    "admin.loginEmail": "Email",
    "admin.loginPassword": "Password",
    "admin.loginSupabaseSubmit": "Sign in with Supabase",
    "admin.loginSupabaseFailed":
      "Supabase sign-in or admin membership verification failed.",
    "admin.loginSupabaseDisabled":
      "Supabase public auth config is not available in this build.",
    "admin.authStatusTitle": "Admin authorization active",
    "admin.authStatusBody":
      "Protected reads and writes use the current HTTP-only admin session or a server-verified Supabase admin account session.",
    "admin.authStatusCheckingTitle": "Checking admin authorization",
    "admin.authStatusCheckingBody":
      "Reading the current server session state before showing protected operation status.",
    "admin.authStatusUnavailableTitle": "Could not confirm admin authorization",
    "admin.authStatusUnavailableBody":
      "The server session check did not complete. Protected operation state is unavailable until the session status endpoint responds.",
    "admin.authStatusDemoTitle": "Demo admin surface",
    "admin.authStatusDemoBody":
      "Admin token protection is not configured. Demo reads and local manual imports are available, but protected persistent writes still require admin credentials and Supabase service configuration.",
    "admin.authStatusLockedTitle": "Admin authorization required",
    "admin.authStatusLockedBody":
      "This protected environment requires an admin session, bearer token, or verified Supabase admin account before protected reads or writes run.",
    "admin.authSource.checking": "Checking",
    "admin.authSource.demo_open": "Demo open",
    "admin.authSource.none": "Not authorized",
    "admin.authSource.admin_token": "Bearer token",
    "admin.authSource.admin_session": "Admin session",
    "admin.authSource.supabase_auth": "Supabase admin",
    "admin.authSource.unavailable": "Unavailable",
    "admin.authRole.owner": "Owner",
    "admin.authRole.admin": "Admin",
    "admin.authRole.reviewer": "Reviewer",
    "admin.logout": "Sign out",
    "admin.logoutSubmitting": "Signing out",
    "admin.logoutFailed": "The admin session could not be cleared.",
    "admin.audit": "Audit trail",
    "admin.auditHelp":
      "Review recent protected writes, correction RPCs, ingestion persistence, and registry changes.",
    "admin.refreshAudit": "Refresh audit",
    "admin.auditFailed": "Audit log failed",
    "admin.noAuditLogs": "No audit logs are available yet.",
    "admin.auditSource.demo": "Demo audit",
    "admin.auditSource.supabase": "Supabase audit",
    "admin.auditReadOnly": "Read-only",
    "admin.auditRow": "Row",
    "admin.auditActor": "Actor",
    "admin.auditIp": "IP",
    "admin.auditUserAgent": "User agent",
    "admin.conflictReview": "Conflict review",
    "admin.correctionHelp":
      "Review conflicts and provider errors, then apply audited corrections only when source evidence supports the change.",
    "admin.reviewQueue": "Review queue",
    "admin.noConflicts": "No conflicts or provider errors are currently queued.",
    "admin.conflictIds": "Conflict IDs",
    "admin.providerIssues": "Provider issues",
    "admin.correctedFields": "Corrected fields",
    "admin.correctionProtected":
      "Corrections are recorded in manual_corrections and protected from later ingestion overwrites.",
    "admin.correctionEvent": "Event to correct",
    "admin.correctionField": "Field to correct",
    "admin.currentValue": "Current value",
    "admin.newValue": "Corrected value",
    "admin.correctionReason": "Correction reason",
    "admin.correctionReasonPlaceholder": "Source evidence and reason for this correction",
    "admin.utcTimestampPlaceholder": "2026-06-19T12:00:00Z",
    "admin.applyCorrection": "Apply correction",
    "admin.correctionSaved": "Correction saved with audit log.",
    "admin.correctionDegraded": "Supabase service credentials are missing; correction writes are skipped.",
    "admin.correctionEventMissing": "The event is not persisted yet; run ingestion before correcting it.",
    "admin.correctionAdminRequired": "Admin session or bearer token is required to apply corrections.",
    "admin.rlsNotice":
      "Anon users can read public views only. Raw source payloads stay server/admin-only.",
    "ingestion.status.queued": "Queued",
    "ingestion.status.running": "Running",
    "ingestion.status.success": "Success",
    "ingestion.status.failed": "Failed",
    "ingestion.status.partial": "Partial",
    "correction.field.title": "Title",
    "correction.field.status": "Status",
    "correction.field.category": "Category",
    "correction.field.scheduled_start_at": "Scheduled start",
    "correction.field.actual_start_at": "Actual start",
    "correction.field.ended_at": "Ended at",
    "correction.field.visibility": "Visibility",
    "correction.field.confidence": "Confidence",
    "legal.privacyTitle": "Privacy",
    "legal.privacyBody":
      "This MVP stores anonymous preferences in local browser storage. No account sync, contact upload, or hidden tracking is required for demo mode.",
    "legal.termsTitle": "Terms",
    "legal.termsBody":
      "Use this service as an unofficial scheduling aid. Always verify critical details at the original YouTube or X source before acting.",
    "legal.sourcesTitle": "Data Sources",
    "legal.sourcesBody":
      "Production ingestion must use official YouTube Data API, official X APIs, and labeled manual imports. The app does not scrape, download, or rehost media.",
    "legal.contactTitle": "Contact / Takedown",
    "legal.contactBody":
      "For corrections or takedown requests, provide the source URL, the affected event, and the requested change. Admins should preserve an audit record.",
    "legal.privacyLocalTitle": "Local preferences",
    "legal.privacyLocalBody":
      "Anonymous favorites, alert toggles, locale, and timezone stay in browser storage in demo mode. Account sync is intentionally not required.",
    "legal.privacyPushTitle": "Web Push",
    "legal.privacyPushBody":
      "When you opt in, the app may store a browser push endpoint, public keys, alert toggles, and favorite IDs. Without VAPID or Supabase, push stays degraded and no send is attempted.",
    "legal.privacySupabaseTitle": "Server data",
    "legal.privacySupabaseBody":
      "Production Supabase stores normalized public schedule rows while raw provider payloads, provider errors, corrections, audit logs, and push receipts remain server or admin scoped.",
    "legal.privacyTrackingTitle": "Tracking limits",
    "legal.privacyTrackingBody":
      "Demo mode does not require analytics, contact upload, hidden tracking, or third party profile enrichment. Future account sync must remain explicit and revocable.",
    "legal.privacyManualTitle": "Manual imports",
    "legal.privacyManualBody":
      "Manual imports are stored locally in the browser unless an admin explicitly persists ingestion results. They can include original source URLs, evidence notes, and schedule corrections.",
    "legal.privacyCacheTitle": "Offline cache",
    "legal.privacyCacheBody":
      "The service worker caches the app shell for read-only offline use. Cached schedules must be treated as stale until the app reconnects and source health refreshes.",
    "legal.privacyAdminTitle": "Admin sessions",
    "legal.privacyAdminBody":
      "Admin sign-in uses short-lived HTTP-only session cookies. Supabase Auth admin accounts are verified server-side against admin_members before an app-owned admin account cookie is issued. Protected writes require admin authorization and should create audit records.",
    "legal.privacyRequestTitle": "Operational logs",
    "legal.privacyRequestBody":
      "Hosts and API providers may process request metadata such as IP address, user agent, timestamps, and error logs for security, quota, abuse prevention, and debugging.",
    "legal.termsUnofficialTitle": "Unofficial service",
    "legal.termsUnofficialBody":
      "Oshi Command Deck is an unofficial fan dashboard and is not affiliated with, endorsed by, or sponsored by ANYCOLOR Inc. or NIJISANJI.",
    "legal.termsVerifyTitle": "Verify original sources",
    "legal.termsVerifyBody":
      "Schedules can change quickly. Treat the deck as a source-backed aid and verify important details on the original YouTube or X page before relying on them.",
    "legal.termsMediaTitle": "Media and branding limits",
    "legal.termsMediaBody":
      "Do not use NIJISANJI or ANYCOLOR logos, character art, copied media, downloaded video, downloaded audio, rehosted thumbnails, iframe embeds, autoplay, or background playback. This app is links-only unless a future policy review explicitly approves a new playback surface.",
    "legal.termsPlatformTitle": "Platform policy",
    "legal.termsPlatformBody":
      "Production deployments must comply with current YouTube API Services Terms, YouTube API Developer Policies, X Developer Terms, and applicable fan or secondary creation guidelines.",
    "legal.termsAvailabilityTitle": "Availability and accuracy",
    "legal.termsAvailabilityBody":
      "The service can be unavailable, stale, incomplete, or wrong when provider APIs fail, quotas are exhausted, sources are private, or creators change plans.",
    "legal.termsCorrectionsTitle": "Corrections and imports",
    "legal.termsCorrectionsBody":
      "Manual imports and corrections are operator aids, not official statements. They must preserve evidence, expose conflicts, and avoid silently replacing provider-controlled facts.",
    "legal.sourcesOfficialTitle": "Official provider APIs",
    "legal.sourcesOfficialBody":
      "Production adapters use the YouTube Data API for upcoming and live discovery, batch detail fetches for status and liveStreamingDetails, and official X APIs for announcement context. Demo fixtures are labeled DEMO when credentials are absent.",
    "legal.sourcesManualTitle": "Manual imports",
    "legal.sourcesManualBody":
      "Manual entries preserve source URLs, original text, evidence notes, UTC schedule fields, provenance, and admin correction history so operators can fix gaps without overwriting provider facts.",
    "legal.sourcesNoScrapeTitle": "No scraping or rehosting",
    "legal.sourcesNoScrapeBody":
      "The app must not scrape YouTube or X, download or rehost video, audio, or thumbnails, or replace source titles with translations. Original source links stay visible.",
    "legal.sourcesAiTitle": "Optional AI fallback",
    "legal.sourcesAiBody":
      "AI parsing is disabled by default, server-only, and runs only after deterministic rules. It may merge only evidence-backed candidates and must never invent dates, collaborators, or cancellations.",
    "legal.sourcesErrorsTitle": "Observable limits",
    "legal.sourcesErrorsBody":
      "Coverage limits, provider errors, quota guardrails, confidence, last checked times, and stale states are visible so users can judge whether data is current enough to trust.",
    "legal.sourcesPublicTitle": "Public sanitized data",
    "legal.sourcesPublicBody":
      "Public views should read sanitized live event rows, source links, and sanitized provider-error/admin-correction summaries. Raw provider payloads, detailed provider error rows, admin correction rows, audit details, and service credentials stay server or admin scoped.",
    "legal.sourcesCorrectionsTitle": "Conflict handling",
    "legal.sourcesCorrectionsBody":
      "Provider ID or URL matches dedupe first, then constrained talent-time similarity. Admin corrections win, YouTube controls live state and URL, direct X context controls announcements and cancellations, and conflicts stay visible.",
    "legal.contactHowTitle": "How to contact",
    "legal.contactHowBody":
      "Use the configured contact address when available. Demo builds clearly show when the address is not configured until NEXT_PUBLIC_CONTACT_EMAIL is set.",
    "legal.contactEvidenceTitle": "Evidence to include",
    "legal.contactEvidenceBody":
      "Include the source URL, affected event, requested change, reason, and a contact route that can verify authority when the request concerns removal or ownership.",
    "legal.contactAuditTitle": "Admin audit trail",
    "legal.contactAuditBody":
      "Admins should preserve correction and takedown decisions in audit logs, including the actor, target record, field changed, and evidence used.",
    "legal.contactTimingTitle": "Response posture",
    "legal.contactTimingBody":
      "High-confidence safety, privacy, or rights requests should be reviewed first. Lower-risk schedule corrections can remain visible with conflict or stale labels until resolved.",
    "legal.contactPrivacyTitle": "Privacy and deletion",
    "legal.contactPrivacyBody":
      "For privacy or deletion requests, include enough information to identify the affected local, push, or Supabase record. Anonymous local preferences can also be cleared from the browser.",
    "legal.referencesTitle": "Primary references",
    "legal.referencesBody":
      "Review these current provider and fan-policy references before launch, policy-sensitive changes, or monetization changes.",
    "legal.ref.anycolor": "ANYCOLOR Guidelines for Secondary Creation",
    "legal.ref.youtubeTerms": "YouTube API Services Terms",
    "legal.ref.youtubePolicies": "YouTube API Developer Policies",
    "legal.ref.xAgreement": "X Developer Agreement and Policy",
    "legal.ref.xPolicy": "X Developer Policy",
    "legal.ref.xTerms": "X Developer terms overview",
    "legal.contactEmailTitle": "Contact channel",
    "legal.contactEmailConfigured":
      "This build has a configured contact address for corrections, privacy questions, and takedown requests.",
    "legal.contactEmailMissing":
      "Demo contact address is not configured. Set NEXT_PUBLIC_CONTACT_EMAIL before public launch.",
    "legal.contactMailSubject": "Oshi Command Deck correction or takedown request",
    "offline.title": "Offline read-only mode",
    "offline.body":
      "Cached app shell is available. Stream data may be stale; reconnect to refresh source health and schedules.",
    "offline.readOnlyTitle": "Read-only cache",
    "offline.readOnlyBody":
      "The offline route is for viewing cached navigation and last-known data only. It does not run ingestion, send alerts, or persist admin changes.",
    "offline.staleTitle": "Reconnect required",
    "offline.staleBody":
      "Treat every cached schedule as stale until the app reconnects, checks provider health, and refreshes the selected timezone view.",
    "offline.snapshotCoverage": "Serving a read-only cached snapshot; stale until refreshed.",
    "empty.streamsTitle": "No streams loaded",
    "empty.streamsBody":
      "Demo fixtures should appear without credentials. If this remains empty, retry or check the build logs.",
    "error.boundaryTitle": "Panel needs attention",
    "error.boundaryBody":
      "The app keeps the rest of the deck available while this panel recovers.",
    "footer.trust":
      "Unofficial fan dashboard. Links open original source pages; no media is downloaded or rehosted.",
    "plural.streams.one": "{count} stream",
    "plural.streams.other": "{count} streams"
  },
  ja: {
    "app.name": "Oshi Command Deck",
    "app.shortName": "Command Deck",
    "app.tagline": "非公式ライブ配信ミッションコントロール",
    "app.description":
      "出典付きライブ配信を追跡する、非公式のモバイルファーストダッシュボードです。",
    "app.unofficial": "非公式ファンツール",
    "app.notAffiliated":
      "ANYCOLOR株式会社およびNIJISANJIとは提携・承認・公式関係のないサービスです。",
    "aria.primaryNav": "主要ナビゲーション",
    "aria.trustNav": "信頼情報ナビゲーション",
    "aria.mobileNav": "モバイルナビゲーション",
    "nav.today": "今日",
    "nav.favorites": "お気に入り",
    "nav.minecraft": "Minecraft",
    "nav.route": "視聴ルート",
    "nav.settings": "設定",
    "nav.admin": "管理",
    "nav.privacy": "プライバシー",
    "nav.terms": "利用規約",
    "nav.dataSources": "データソース",
    "nav.contact": "連絡 / 削除依頼",
    "common.demo": "DEMO",
    "common.loading": "読み込み中",
    "common.empty": "表示できる項目がありません",
    "common.error": "このパネルを読み込めませんでした",
    "common.retry": "再試行",
    "common.clear": "クリア",
    "common.clearAll": "すべて解除",
    "common.save": "保存",
    "common.saved": "保存済み",
    "common.enabled": "有効",
    "common.disabled": "無効",
    "common.unknown": "不明",
    "common.all": "すべて",
    "common.source": "ソース",
    "common.sources": "ソース",
    "common.confidence": "信頼度",
    "common.lastChecked": "最終確認",
    "common.coverage": "カバレッジ",
    "common.health": "状態",
    "common.status": "ステータス",
    "common.category": "カテゴリ",
    "common.talent": "タレント",
    "common.branch": "ブランチ",
    "common.language": "言語",
    "common.favorite": "お気に入り",
    "common.favorites": "お気に入り",
    "common.alerts": "通知",
    "common.timezone": "タイムゾーン",
    "common.locale": "表示言語",
    "common.localTime": "ローカル時刻",
    "common.originalTitle": "原題",
    "common.collaborators": "参加者",
    "common.links": "リンク",
    "common.manualEvidence": "手動証拠",
    "common.manualEvidenceLabel": "手動証拠: {label}",
    "common.reason": "理由",
    "common.reasons": "理由",
    "common.archive": "アーカイブ",
    "common.archived": "アーカイブ済み",
    "common.unarchive": "戻す",
    "common.stale": "古い情報",
    "common.offline": "オフライン",
    "common.cached": "キャッシュ",
    "common.install": "インストール",
    "common.notAvailable": "利用不可",
    "common.noneReported": "報告なし",
    "common.providerError": "プロバイダーエラー",
    "common.conflicts": "競合",
    "common.provenance": "出典",
    "common.provenanceDetails": "出典根拠の詳細",
    "common.sourceId": "ソースID",
    "common.fetchedAt": "取得時刻",
    "common.fields": "対象フィールド",
    "common.sourceUrl": "ソースURL",
    "common.openSource": "ソースを開く",
    "common.rawEvidence": "根拠",
    "common.machineTranslation": "機械翻訳",
    "common.adminRequired": "管理者権限が必要です",
    "locale.en": "英語",
    "locale.ja": "日本語",
    "status.scheduled": "予定",
    "status.live": "ライブ中",
    "status.ended": "終了",
    "status.tbd": "未定",
    "status.unverified": "未検証",
    "category.chat": "雑談",
    "category.game": "ゲーム",
    "category.minecraft": "Minecraft",
    "category.music": "音楽",
    "category.collaboration": "コラボ",
    "category.event": "イベント",
    "category.other": "その他",
    "provider.youtube": "YouTube",
    "provider.x": "X",
    "provider.manual": "手動",
    "provider.future": "将来枠",
    "provenance.field.title": "タイトル",
    "provenance.field.status": "ステータス",
    "provenance.field.scheduledStart": "予定開始",
    "provenance.field.context": "文脈",
    "provenance.field.cancellation": "キャンセル",
    "provenance.field.collaborators": "参加者",
    "provenance.field.category": "カテゴリ",
    "visibility.public": "公開",
    "visibility.unlisted": "限定公開",
    "visibility.unknown": "不明",
    "health.healthy": "正常",
    "health.degraded": "低下",
    "health.stale": "古い",
    "health.missing_credentials": "認証情報なし",
    "health.disabled": "無効",
    "sourceHealth.coverage.rawEvidenceFallback":
      "カバレッジ詳細はプロバイダー証跡として保持されています。信頼する前に出典詳細を確認してください。",
    "sourceHealth.coverage.demo.youtube.pending_config":
      "YouTube Data APIキーとチャンネルレジストリが設定されるまで、デモfixturesを表示します。",
    "sourceHealth.coverage.demo.x.official_api_disabled":
      "公式X APIアクセスが未設定です。スクレイピングは無効のため、ソーシャル文脈は利用できません。",
    "sourceHealth.coverage.manual.imports_require_corrections":
      "手動インポートはラベル付きで、修正記録なしにプロバイダー事実を上書きできません。",
    "sourceHealth.coverage.manual.demo_require_corrections":
      "手動/デモ項目はラベル付きで、プロバイダーデータを上書きする前に修正記録が必要です。",
    "sourceHealth.coverage.future.adapter_pending":
      "将来プロバイダーは、有効化前にadapter、出典、quota、RLSレビューを通過する必要があります。",
    "sourceHealth.coverage.youtube.demo_not_called":
      "デモモードが有効です。公式YouTube Data APIは呼び出していません。",
    "sourceHealth.coverage.youtube.missing_credentials":
      "YouTube認証情報がないため、デモfixturesのみ利用できます。",
    "sourceHealth.coverage.youtube.official_search":
      "公式YouTube Data APIで、設定済みチャンネル{channels}件のライブ/予定を検索します。チャンネル・イベント種別ごとの最大取得数は{maxResults}件です。",
    "sourceHealth.coverage.youtube.official_search_stopped_early":
      "公式YouTube Data APIで、設定済みチャンネル{channels}件のライブ/予定を検索します。チャンネル・イベント種別ごとの最大取得数は{maxResults}件です。quotaまたはrate-limit backoffのため、プロバイダー実行を早期停止しました。",
    "sourceHealth.coverage.youtube.cached":
      "quota削減のため、公式YouTube API結果を{seconds}秒のキャッシュ枠から表示しています。",
    "sourceHealth.coverage.youtube.registry_error":
      "YouTubeチャンネルレジストリが不正です。ライブ取り込み前にレジストリコード {code} を修正してください。",
    "sourceHealth.coverage.youtube.registry_missing":
      "YouTubeチャンネルレジストリが空です。ライブ取り込み前に確認済みの公開チャンネルIDを追加してください。",
    "sourceHealth.coverage.x.demo_not_called":
      "デモモードが有効です。公式X APIは呼び出していません。",
    "sourceHealth.coverage.x.missing_credentials":
      "X認証情報がありません。スクレイピングは無効のため、ソーシャル文脈は利用できません。",
    "sourceHealth.coverage.x.official_search_ai_enabled":
      "公式X recent searchで、設定済みハンドル{handles}件を検索します。スクレイピングは行いません。決定的パースを先に実行し、検証済みAI fallbackは有効です。",
    "sourceHealth.coverage.x.official_search_ai_disabled":
      "公式X recent searchで、設定済みハンドル{handles}件を検索します。スクレイピングは行いません。決定的パースを先に実行し、検証済みAI fallbackは無効です。",
    "sourceHealth.coverage.x.official_search_ai_enabled_stopped_early":
      "公式X recent searchで、設定済みハンドル{handles}件を検索します。スクレイピングは行いません。決定的パースを先に実行し、検証済みAI fallbackは有効です。quotaまたはrate-limit backoffのため、プロバイダー実行を早期停止しました。",
    "sourceHealth.coverage.x.official_search_ai_disabled_stopped_early":
      "公式X recent searchで、設定済みハンドル{handles}件を検索します。スクレイピングは行いません。決定的パースを先に実行し、検証済みAI fallbackは無効です。quotaまたはrate-limit backoffのため、プロバイダー実行を早期停止しました。",
    "sourceHealth.coverage.x.registry_error":
      "Xハンドルレジストリが不正です。ライブ取り込み前にレジストリコード {code} を修正してください。",
    "sourceHealth.coverage.x.registry_missing":
      "Xハンドルレジストリが空です。X取り込み前に確認済みの公式ハンドルを追加してください。",
    "sourceHealth.coverage.provider.cooldown":
      "クールダウン中のため、{retryAfterUtc} までプロバイダー呼び出しをスキップします。",
    "sourceHealth.coverage.supabase.not_configured":
      "Supabase public read mode は未設定です。",
    "sourceHealth.coverage.supabase.empty":
      "Supabase public read mode は設定済みですが、ライブイベントがありません。",
    "sourceHealth.coverage.supabase.serving_public":
      "Supabase public read mode が正規化イベントと公開ソースリンクを配信しています。",
    "sourceHealth.coverage.supabase.read_failed":
      "Supabase public read に失敗しました。Supabase read mode が選択されているため、provider adapter は呼び出していません。",
    "sourceHealth.coverage.offline.cached_snapshot":
      "読み取り専用のキャッシュ済みスナップショットを表示中です。更新まで予定とソースヘルスは古い情報として扱ってください。",
    "sourceHealth.error.providerMessage":
      "プロバイダーがエラーを返しました。この結果を信頼する前に出典証跡を確認してください。",
    "sourceHealth.error.missing_credentials.youtube_data_api_key":
      "YOUTUBE_DATA_API_KEY が設定されていません。",
    "sourceHealth.error.missing_credentials.x_bearer_token":
      "X_BEARER_TOKEN が設定されていません。",
    "sourceHealth.error.provider.code": "プロバイダーエラーコード: {code}",
    "sourceHealth.error.provider.cooldown": "{retryAfterUtc} までプロバイダーのクールダウン中です。",
    "sourceHealth.error.supabase.public_read_failed":
      "Supabase public read に失敗しました。管理者はサーバーログとプロバイダーヘルスを確認してください。",
    "home.title": "今日のコマンドデッキ",
    "home.subtitle":
      "カバレッジ制限を明示した、時系列・出典付きのライブ配信トラッカーです。",
    "home.sourceHealth": "ソースヘルス",
    "home.sourceConfidence": "ソース信頼度: {source}",
    "home.filters": "フィルター",
    "home.searchLabel": "配信を検索",
    "home.searchPlaceholder": "タレント、タイトル、カテゴリ、参加者",
    "home.favoriteOnly": "お気に入りのみ",
    "home.noResults":
      "現在のフィルターに一致する配信がありません。フィルター解除または手動インポートを確認してください。",
    "home.loadingText": "デモデータとローカル設定を確認しています。",
    "home.errorText": "ローカルのデモデータを準備できませんでした。",
    "home.demoNotice":
      "デモモードが有効です。YouTube、X、Supabase の認証情報なしで動作します。",
    "home.liveNotice":
      "実APIモードが有効です。設定済みの公式プロバイダーAPIから配信を取得します。",
    "home.degradedNotice":
      "実APIモードは一部低下しています。プロバイダーエラーと古い情報ラベルを表示します。",
    "home.offlineNotice":
      "オフラインキャッシュが有効です。再接続するまでキャッシュ済みデータは古い可能性があります。",
    "favorites.title": "お気に入りと通知",
    "favorites.subtitle":
      "匿名設定をローカル保存し、将来のアカウント同期にも拡張できる形にしています。",
    "favorites.talents": "お気に入りタレント",
    "favorites.types": "お気に入り配信タイプ",
    "favorites.languages": "お気に入り言語",
    "favorites.languagesHelp":
      "言語設定はローカルに保存され、配信の言語が一致した場合に通知理由として使われます。",
    "favorites.overlapTitle": "重複検出",
    "favorites.overlapEmpty": "現在の範囲ではお気に入り配信の重複はありません。",
    "favorites.alertUpcoming": "予定配信通知",
    "favorites.alertLive": "ライブ開始通知",
    "favorites.alertMinecraft": "Minecraft 通知",
    "favorites.alertCollaboration": "コラボ通知",
    "favorites.alertQueueTitle": "通知キュー",
    "favorites.alertQueueSubtitle":
      "Push配信を実行する前に、有効な通知タイプとお気に入り条件に一致する配信を確認します。",
    "favorites.alertQueueEmpty":
      "現在、有効な通知タイプとお気に入り条件に一致する配信はありません。",
    "favorites.alertPriority": "優先度",
    "favorites.pushTitle": "Web Push",
    "favorites.pushUnavailable":
      "VAPID が未設定です。このデモでは通知はアプリ内・ローカルに留まります。",
    "favorites.pushConfigured":
      "この端末ではWeb Pushを利用できます。ただし配信にはサーバー側VAPIDとSupabase保存が必要です。",
    "favorites.pushEnable": "Push 通知を有効化",
    "favorites.pushDisable": "Push 通知を解除",
    "favorites.pushDenied": "ブラウザの通知権限が拒否されました。",
    "favorites.pushSaving": "Push購読を保存中",
    "favorites.pushUnsubscribing": "Push購読を解除中",
    "favorites.pushSaved": "この端末でPush通知を利用できます。",
    "favorites.pushUnsubscribed": "この端末のPush通知を解除しました。",
    "favorites.pushNoSubscription": "この端末に有効なPush購読は見つかりませんでした。",
    "favorites.pushDeviceChecking": "この端末のPush購読状態を確認中です。",
    "favorites.pushDeviceUnsupported": "このブラウザではWeb Push購読を管理できません。",
    "favorites.pushDeviceUnknown": "この端末のPush購読状態を確認できませんでした。",
    "favorites.pushDegraded": "Push購読を保存できませんでした。通知はローカルに留まります。",
    "favorites.pushDisableDegraded":
      "この端末側の購読は解除しましたが、サーバー側の整理は確認できませんでした。",
    "favorites.pushEnableError": "Push通知を有効化できませんでした。",
    "favorites.pushDisableError": "この端末のPush通知を解除できませんでした。",
    "alert.delivery.push_ready": "Push準備済み",
    "alert.delivery.local_only": "ローカルのみ",
    "alert.delivery.needs_review": "要確認",
    "alert.reason.live": "ライブ中",
    "alert.reason.upcoming": "予定",
    "alert.reason.minecraft": "Minecraft",
    "alert.reason.collaboration": "コラボ",
    "alert.reason.favorite_talent": "お気に入りタレント",
    "alert.reason.favorite_category": "お気に入りタイプ",
    "alert.reason.favorite_language": "お気に入り言語",
    "alert.reason.favorite_collaborator": "お気に入り参加者",
    "alert.reason.stale": "古いソース",
    "alert.reason.low_confidence": "低信頼度",
    "alert.reason.unverified": "要検証",
    "route.title": "視聴ルート",
    "route.subtitle":
      "おすすめは、お気に入り、状態、重複、カテゴリ、信頼度、古さだけでスコア化します。",
    "route.archiveQueue": "アーカイブキュー",
    "route.archiveHelp":
      "アーカイブした項目は、戻すまで視聴ルートのスコア対象から外れます。",
    "route.noItems": "アーカイブとフィルター後に候補が残っていません。",
    "route.evidence.minecraftAlertEnabled": "Minecraft通知が有効",
    "route.evidence.minutes.one": "{count} 分",
    "route.evidence.minutes.other": "{count} 分",
    "reason.live_now": "現在ライブ中",
    "reason.favorite_talent": "お気に入りタレント",
    "reason.favorite_category": "お気に入りカテゴリ",
    "reason.minecraft_priority": "Minecraft 優先",
    "reason.collaboration": "コラボ情報",
    "reason.overlap": "別 POV と重複",
    "reason.starting_soon": "まもなく開始",
    "reason.high_confidence": "高信頼度",
    "reason.stale_penalty": "古い情報の減点",
    "reason.manual_correction": "管理者修正",
    "minecraft.title": "Minecraft セッション",
    "minecraft.subtitle":
      "POV を説明可能なセッションにまとめ、関係表示にはリスト代替も用意します。",
    "minecraft.sessions": "セッション",
    "minecraft.relationships": "関係ビュー",
    "minecraft.relationshipFallback": "アクセシブルな関係リスト",
    "minecraft.participants": "参加者",
    "minecraft.sessionStart": "開始",
    "minecraft.sessionEnd": "終了",
    "minecraft.povCount": "POV数",
    "minecraft.sessionLinks": "セッションのソースリンク",
    "minecraft.sessionConfidence": "セッション信頼度: {title}",
    "minecraft.noSessions": "現在のデモ範囲には Minecraft セッションがありません。",
    "settings.title": "設定",
    "settings.subtitle":
      "表示言語、タイムゾーン、インストール、オフライン表示、プライバシー境界を管理します。",
    "settings.languageSelector": "表示言語",
    "settings.referenceLocaleHelp":
      "参照カタログは英語と日本語を同梱しています。他の有効なBCP 47タグでは、文言はフォールバックしつつ、lang、方向、日時、数値、並び替えにそのタグを使います。",
    "settings.localeTagLabel": "BCP 47ロケールタグ",
    "settings.localeTagPlaceholder": "例: ar-EG, fr-CA, en-US",
    "settings.localeTagHelp":
      "無効なタグは安全に英語へフォールバックします。ar-EGのような有効なRTLタグでは、コンポーネント変更なしで文書方向を切り替えます。",
    "settings.saveLocale": "表示ロケールを保存",
    "settings.currentDirection": "現在の方向",
    "settings.timezoneSelector": "表示タイムゾーン",
    "settings.timezoneHelp":
      "時刻は UTC で保存し、選択した IANA タイムゾーンで表示します。",
    "settings.timezoneTagLabel": "IANAタイムゾーン",
    "settings.timezoneTagPlaceholder": "例: Europe/Paris, America/Sao_Paulo",
    "settings.timezoneTagHelp":
      "有効なIANAタイムゾーンを任意に入力できます。無効な値は安全にAsia/Tokyoへフォールバックします。",
    "settings.timezoneInvalidFallback":
      "このタイムゾーンは認識できなかったため、表示タイムゾーンをAsia/Tokyoへ戻しました。",
    "settings.saveTimezone": "表示タイムゾーンを保存",
    "settings.browserDetected": "ブラウザ検出",
    "settings.installTitle": "アプリをインストール",
    "settings.installHelp":
      "インストール対応はブラウザに依存します。未インストールでも利用できます。",
    "settings.installAction": "アプリをインストール",
    "settings.installAvailable": "インストール準備完了",
    "settings.installUnavailable": "インストールプロンプト未提供",
    "settings.installInstalling": "ブラウザ選択を待機中",
    "settings.installAccepted": "インストール承認済み",
    "settings.installDismissed": "インストールは見送り",
    "settings.installInstalled": "インストール済み",
    "settings.installFallback": "ブラウザ制御",
    "settings.offlineTitle": "オフラインキャッシュ",
    "settings.offlineHelp":
      "オフラインモードは読み取り専用で、必要に応じてキャッシュ済みデータを古い情報として表示します。",
    "settings.privacyTitle": "匿名設定",
    "settings.privacyHelp":
      "この MVP ではお気に入りとフィルターをローカル保存します。アカウント同期は後から追加できます。",
    "settings.rtlPreview": "RTL 対応",
    "settings.rtlHelp":
      "レイアウト方向はロケールメタデータで制御します。ja/en は既定で LTR です。",
    "settings.desktopPreview": "デスクトップUI対応",
    "settings.desktopPreviewBody":
      "モバイル、macOS級の広いデスクトップ、Windows 1366px級のデスクトップを同じコンポーネントで破綻なく表示します。",
    "admin.title": "保護された管理コンソール",
    "admin.subtitle":
      "レジストリ、プロバイダー ID、別名、修正、信頼度、取り込み実行を管理します。",
    "admin.demoOnly":
      "このデモは保護された管理画面の形を示します。本番の書き込みは管理者 RBAC と監査ログ付きのサーバールートを通す必要があります。",
    "admin.talentRegistry": "タレントレジストリ",
    "admin.ingestionRuns": "取り込み実行",
    "admin.corrections": "修正",
    "admin.providerIds": "プロバイダー ID",
    "admin.registryManager": "レジストリ管理",
    "admin.registryHelp":
      "設定済みのcreator/provider行を読み込み、プロバイダーID、ハンドル、別名、タグ、信頼度、有効状態をupsertします。",
    "admin.registrySource": "レジストリソース",
    "admin.provider": "プロバイダー",
    "admin.providerItemId": "プロバイダーID / ハンドル",
    "admin.displayName": "表示名",
    "admin.slug": "スラッグ",
    "admin.aliases": "別名",
    "admin.tags": "タグ",
    "admin.confidenceInput": "信頼度",
    "admin.active": "有効",
    "admin.refreshRegistry": "レジストリ更新",
    "admin.saveRegistry": "レジストリ行を保存",
    "admin.registrySaved": "レジストリ行を監査ログ付きで保存しました。",
    "admin.registryDegraded": "Supabase service認証情報がないため、レジストリ書き込みはスキップされました。",
    "admin.registryAdminRequired": "レジストリ行の書き込みには管理セッションまたはBearerトークンが必要です。",
    "admin.providerExportTitle": "プロバイダー設定エクスポート",
    "admin.providerExportHelp":
      "有効なレジストリ行から、サーバー専用のYOUTUBE_CHANNELS_JSONとX_HANDLES_JSONの値を準備します。本番利用前に各プロバイダーIDを公式ソースで確認してください。",
    "admin.youtubeChannelsJson": "YOUTUBE_CHANNELS_JSON",
    "admin.xHandlesJson": "X_HANDLES_JSON",
    "admin.youtubeExportCount": "YouTube行 {count}件",
    "admin.xExportCount": "X行 {count}件",
    "admin.copyYoutubeConfig": "YouTube JSONをコピー",
    "admin.copyXConfig": "X JSONをコピー",
    "admin.providerExportCopied": "プロバイダー設定をコピーしました。",
    "admin.providerExportCopyFailed":
      "クリップボードを利用できません。JSONテキストを手動で選択してください。",
    "admin.providerExportWarnings": "エクスポート確認警告",
    "admin.providerExportWarningCount.one": "警告 {count}件",
    "admin.providerExportWarningCount.other": "警告 {count}件",
    "admin.providerExportWarning.demo_row":
      "デモ用プロバイダーIDはローカルfixtures専用です。本番利用前に確認済みの公式IDへ置き換えてください。",
    "admin.providerExportWarning.low_confidence":
      "信頼度は{confidence}です。ライブ取り込みに使う前にソース所有関係を確認してください。",
    "admin.providerExportWarning.ignored_provider":
      "このプロバイダーはYouTubeまたはXの環境変数JSONには出力されません。",
    "admin.providerExportWarning.inactive_row":
      "無効な行はプロバイダー環境変数JSONから除外されます。",
    "admin.providerExportWarning.missing_provider_id":
      "プロバイダーIDまたはハンドルがないため、この行はエクスポートできません。",
    "admin.runIngestion": "デモ取り込みを実行",
    "admin.manualImport": "手動インポート",
    "admin.manualImportHelp":
      "プロバイダー認証情報がない場合や確認待ちソースがある場合に、実際の予定をローカル登録します。",
    "admin.localImports": "ローカル手動インポート",
    "admin.sourceUrl": "ソースURL",
    "admin.titleLabel": "配信タイトル",
    "admin.titlePlaceholder": "Minecraft リレー POV / 21:00 JST",
    "admin.scheduledLocal": "予定ローカル時刻",
    "admin.collaboratorsText": "参加者",
    "admin.collaboratorsPlaceholder": "Kuzuha, Elira Pendora",
    "admin.languagesText": "言語",
    "admin.languagesPlaceholder": "ja, en",
    "admin.notes": "根拠メモ",
    "admin.notesPlaceholder": "告知を手動確認済み",
    "admin.sourceUrlPlaceholder": "https://www.youtube.com/watch?v=...",
    "admin.addManual": "手動配信を追加",
    "admin.removeManual": "削除",
    "admin.manualLocal": "手動 / ローカル",
    "admin.manualSaved": "手動配信をローカル保存しました。",
    "admin.noManualImports": "ローカル手動インポートはまだありません。",
    "admin.manualRequired":
      "タイトル、タレント選択、ソースURLまたは根拠メモのいずれかが必要です。",
    "admin.runDryRun": "取り込みドライランを実行",
    "admin.runDryRunHelp":
      "ローカルのサーバールートを呼び出します。管理者認証がない場合はデモモードのまま、書き込みは行いません。",
    "admin.running": "実行中",
    "admin.runSucceeded": "ドライラン完了",
    "admin.runFailed": "ドライラン失敗",
    "admin.runHistory": "実行履歴",
    "admin.refreshHistory": "履歴を更新",
    "admin.historyFailed": "実行履歴を取得できませんでした",
    "admin.noRunHistory": "取り込み実行履歴はまだありません。",
    "admin.historySource.demo": "デモ履歴",
    "admin.historySource.supabase": "Supabase履歴",
    "admin.registrySource.demo": "デモレジストリ",
    "admin.registrySource.supabase": "Supabaseレジストリ",
    "admin.mode": "モード",
    "admin.ingestionMode.demo": "デモ",
    "admin.ingestionMode.live_api": "実API",
    "admin.ingestionMode.mixed_degraded": "一部低下",
    "admin.adapterResults": "アダプター結果",
    "admin.streamsFound": "検出配信数",
    "admin.requests": "リクエスト数",
    "admin.quotaCost": "クォータ消費",
    "admin.persistSkipped": "DB書き込みスキップ",
    "admin.loginTitle": "管理者サインイン",
    "admin.loginSubtitle":
      "保護された操作を開くため、サーバー側の管理ジョブトークンまたはSupabase Auth管理アカウントを使います。",
    "admin.loginCardTitle": "保護された管理者アクセス",
    "admin.loginHelp":
      "トークンはサーバー側で検証し、短時間有効なHTTP-only Cookieに交換します。",
    "admin.loginToken": "管理トークン",
    "admin.loginSubmit": "管理画面を開く",
    "admin.loginSubmitting": "トークン確認中",
    "admin.loginFailed": "管理トークンを確認できませんでした。",
    "admin.loginDisabled": "この環境では管理トークン保護が設定されていません。",
    "admin.loginSupabaseTitle": "Supabase管理アカウント",
    "admin.loginSupabaseHelp":
      "Supabase Authでサインインし、admin_membersをサーバー側で検証してから、HTTP-only管理セッションCookieだけを保存します。",
    "admin.loginEmail": "メールアドレス",
    "admin.loginPassword": "パスワード",
    "admin.loginSupabaseSubmit": "Supabaseでサインイン",
    "admin.loginSupabaseFailed":
      "Supabaseサインインまたは管理メンバー確認に失敗しました。",
    "admin.loginSupabaseDisabled":
      "このビルドではSupabase公開Auth設定を利用できません。",
    "admin.authStatusTitle": "管理者認可が有効です",
    "admin.authStatusBody":
      "保護された読み取りと書き込みは、現在のHTTP-only管理セッションまたはサーバー検証済みのSupabase管理アカウントセッションを使います。",
    "admin.authStatusCheckingTitle": "管理者認可を確認中",
    "admin.authStatusCheckingBody":
      "保護された操作の状態を表示する前に、現在のサーバーセッション状態を確認しています。",
    "admin.authStatusUnavailableTitle": "管理者認可を確認できません",
    "admin.authStatusUnavailableBody":
      "サーバーセッション確認が完了しませんでした。セッション状態エンドポイントが応答するまで、保護された操作の状態は利用できません。",
    "admin.authStatusDemoTitle": "デモ管理画面",
    "admin.authStatusDemoBody":
      "管理トークン保護は未設定です。デモ読み取りとローカル手動インポートは利用できますが、保護された永続書き込みには管理認証情報とSupabase service設定が必要です。",
    "admin.authStatusLockedTitle": "管理者認可が必要です",
    "admin.authStatusLockedBody":
      "この保護環境では、保護された読み取りや書き込みを実行する前に、管理セッション、Bearerトークン、または検証済みSupabase管理アカウントが必要です。",
    "admin.authSource.checking": "確認中",
    "admin.authSource.demo_open": "デモ公開",
    "admin.authSource.none": "未認可",
    "admin.authSource.admin_token": "Bearerトークン",
    "admin.authSource.admin_session": "管理セッション",
    "admin.authSource.supabase_auth": "Supabase管理者",
    "admin.authSource.unavailable": "確認不能",
    "admin.authRole.owner": "オーナー",
    "admin.authRole.admin": "管理者",
    "admin.authRole.reviewer": "レビュアー",
    "admin.logout": "サインアウト",
    "admin.logoutSubmitting": "サインアウト中",
    "admin.logoutFailed": "管理セッションを消去できませんでした。",
    "admin.audit": "監査ログ",
    "admin.auditHelp":
      "保護された書き込み、修正RPC、取り込み永続化、レジストリ変更の最近の履歴を確認します。",
    "admin.refreshAudit": "監査ログを更新",
    "admin.auditFailed": "監査ログを取得できませんでした",
    "admin.noAuditLogs": "監査ログはまだありません。",
    "admin.auditSource.demo": "デモ監査",
    "admin.auditSource.supabase": "Supabase監査",
    "admin.auditReadOnly": "読み取り専用",
    "admin.auditRow": "行",
    "admin.auditActor": "実行者",
    "admin.auditIp": "IP",
    "admin.auditUserAgent": "ユーザーエージェント",
    "admin.conflictReview": "競合レビュー",
    "admin.correctionHelp":
      "競合とプロバイダーエラーを確認し、ソース根拠がある場合だけ監査付きの修正を適用します。",
    "admin.reviewQueue": "レビューキュー",
    "admin.noConflicts": "現在キューに入っている競合やプロバイダーエラーはありません。",
    "admin.conflictIds": "競合ID",
    "admin.providerIssues": "プロバイダー問題",
    "admin.correctedFields": "修正済みフィールド",
    "admin.correctionProtected":
      "修正は manual_corrections に記録し、以後の取り込みで上書きされないよう保護します。",
    "admin.correctionEvent": "修正対象イベント",
    "admin.correctionField": "修正対象フィールド",
    "admin.currentValue": "現在の値",
    "admin.newValue": "修正後の値",
    "admin.correctionReason": "修正理由",
    "admin.correctionReasonPlaceholder": "この修正のソース根拠と理由",
    "admin.utcTimestampPlaceholder": "2026-06-19T12:00:00Z",
    "admin.applyCorrection": "修正を適用",
    "admin.correctionSaved": "修正を監査ログ付きで保存しました。",
    "admin.correctionDegraded": "Supabase service認証情報がないため、修正書き込みはスキップされました。",
    "admin.correctionEventMissing": "イベントがまだ永続化されていません。修正前に取り込みを実行してください。",
    "admin.correctionAdminRequired": "修正の適用には管理セッションまたはBearerトークンが必要です。",
    "admin.rlsNotice":
      "匿名ユーザーは public view のみ参照可能です。raw source payload はサーバー/管理者専用です。",
    "ingestion.status.queued": "待機中",
    "ingestion.status.running": "実行中",
    "ingestion.status.success": "成功",
    "ingestion.status.failed": "失敗",
    "ingestion.status.partial": "一部成功",
    "correction.field.title": "タイトル",
    "correction.field.status": "ステータス",
    "correction.field.category": "カテゴリ",
    "correction.field.scheduled_start_at": "予定開始",
    "correction.field.actual_start_at": "実開始",
    "correction.field.ended_at": "終了時刻",
    "correction.field.visibility": "公開状態",
    "correction.field.confidence": "信頼度",
    "legal.privacyTitle": "プライバシー",
    "legal.privacyBody":
      "この MVP は匿名設定をブラウザのローカルストレージに保存します。デモモードではアカウント同期、連絡先アップロード、隠れたトラッキングは不要です。",
    "legal.termsTitle": "利用規約",
    "legal.termsBody":
      "このサービスは非公式のスケジュール補助として利用してください。重要な詳細は必ず元の YouTube または X ソースで確認してください。",
    "legal.sourcesTitle": "データソース",
    "legal.sourcesBody":
      "本番取り込みは YouTube Data API、公式 X API、ラベル付き手動インポートのみを使います。スクレイピング、メディアのダウンロード、再ホストは行いません。",
    "legal.contactTitle": "連絡 / 削除依頼",
    "legal.contactBody":
      "修正や削除依頼では、ソース URL、対象イベント、希望する変更内容を提示してください。管理者は監査記録を残す必要があります。",
    "legal.privacyLocalTitle": "ローカル設定",
    "legal.privacyLocalBody":
      "デモモードでは、匿名のお気に入り、通知トグル、ロケール、タイムゾーンをブラウザストレージに保存します。アカウント同期は意図的に必須にしていません。",
    "legal.privacyPushTitle": "Web Push",
    "legal.privacyPushBody":
      "オプトインした場合、ブラウザのPushエンドポイント、公開鍵、通知トグル、お気に入りIDを保存することがあります。VAPIDまたはSupabaseがない場合、Pushは劣化状態のままで送信しません。",
    "legal.privacySupabaseTitle": "サーバーデータ",
    "legal.privacySupabaseBody":
      "本番のSupabaseには正規化済みの公開スケジュール行を保存し、プロバイダーの生ペイロード、エラー、修正、監査ログ、Push受領記録はサーバーまたは管理者スコープに限定します。",
    "legal.privacyTrackingTitle": "トラッキング制限",
    "legal.privacyTrackingBody":
      "デモモードでは分析、連絡先アップロード、隠れたトラッキング、第三者プロフィール補強を必要としません。将来のアカウント同期も明示的かつ解除可能である必要があります。",
    "legal.privacyManualTitle": "手動インポート",
    "legal.privacyManualBody":
      "管理者が取り込み結果を明示的に永続化しない限り、手動インポートはブラウザ内にローカル保存されます。元ソースURL、証拠メモ、スケジュール修正を含むことがあります。",
    "legal.privacyCacheTitle": "オフラインキャッシュ",
    "legal.privacyCacheBody":
      "サービスワーカーは読み取り専用オフライン利用のためにアプリシェルをキャッシュします。再接続してソースヘルスが更新されるまで、キャッシュ済みスケジュールは古いものとして扱う必要があります。",
    "legal.privacyAdminTitle": "管理者セッション",
    "legal.privacyAdminBody":
      "管理者サインインは短命のHTTP-onlyセッションCookieを使います。Supabase Auth管理アカウントはadmin_membersに対してサーバー側で検証し、アプリ所有の管理アカウントCookieを発行します。保護された書き込みには管理者認可が必要で、監査記録を作成するべきです。",
    "legal.privacyRequestTitle": "運用ログ",
    "legal.privacyRequestBody":
      "ホストやAPIプロバイダーは、セキュリティ、クォータ、不正利用防止、デバッグのために、IPアドレス、ユーザーエージェント、時刻、エラーログなどのリクエストメタデータを処理することがあります。",
    "legal.termsUnofficialTitle": "非公式サービス",
    "legal.termsUnofficialBody":
      "Oshi Command Deck は非公式ファンダッシュボードであり、ANYCOLOR株式会社またはNIJISANJIとの提携、承認、協賛を受けたものではありません。",
    "legal.termsVerifyTitle": "元ソース確認",
    "legal.termsVerifyBody":
      "スケジュールは急に変わることがあります。このデッキは出典付き補助として扱い、重要な詳細は必ず元のYouTubeまたはXページで確認してください。",
    "legal.termsMediaTitle": "メディアとブランド制限",
    "legal.termsMediaBody":
      "NIJISANJIまたはANYCOLORのロゴ、キャラクターアート、コピーされたメディア、ダウンロードした動画、音声、再ホストされたサムネイル、iframe埋め込み、自動再生、バックグラウンド再生は使用しません。このアプリはリンクのみで、将来の再生面は別途ポリシーレビューで明示的に承認された場合だけ追加します。",
    "legal.termsPlatformTitle": "プラットフォームポリシー",
    "legal.termsPlatformBody":
      "本番デプロイでは、最新のYouTube API Services Terms、YouTube API Developer Policies、X Developer Terms、および適用されるファン/二次創作ガイドラインに従う必要があります。",
    "legal.termsAvailabilityTitle": "可用性と正確性",
    "legal.termsAvailabilityBody":
      "プロバイダーAPIの失敗、クォータ枯渇、非公開ソース、クリエイター側の予定変更により、サービスは利用不能、古い、不完全、または誤った状態になることがあります。",
    "legal.termsCorrectionsTitle": "修正とインポート",
    "legal.termsCorrectionsBody":
      "手動インポートと修正は運用補助であり、公式発表ではありません。証拠を保持し、競合を表示し、プロバイダー管理の事実を黙って置き換えない必要があります。",
    "legal.sourcesOfficialTitle": "公式プロバイダーAPI",
    "legal.sourcesOfficialBody":
      "本番アダプターは、YouTube Data APIで予定/ライブを検出し、ステータスとliveStreamingDetailsをバッチ取得し、告知文脈には公式X APIを使います。認証情報がない場合はDEMOラベル付きfixturesを表示します。",
    "legal.sourcesManualTitle": "手動インポート",
    "legal.sourcesManualBody":
      "手動項目は、ソースURL、原文、証拠メモ、UTCスケジュール、来歴、管理者修正履歴を保持し、プロバイダー事実を上書きせずに欠落を補えるようにします。",
    "legal.sourcesNoScrapeTitle": "スクレイピングと再ホスト禁止",
    "legal.sourcesNoScrapeBody":
      "このアプリはYouTubeやXをスクレイピングせず、動画、音声、サムネイルのダウンロードや再ホストも行わず、ソースタイトルを翻訳で置き換えません。元ソースリンクを常に表示します。",
    "legal.sourcesAiTitle": "任意のAIフォールバック",
    "legal.sourcesAiBody":
      "AI解析はデフォルト無効、サーバー専用で、決定的ルールの後にのみ実行します。証拠に裏付けられた候補だけを統合でき、日時、コラボ相手、中止情報を捏造してはいけません。",
    "legal.sourcesErrorsTitle": "観測できる制限",
    "legal.sourcesErrorsBody":
      "ユーザーがデータの新しさと信頼性を判断できるよう、カバレッジ制限、プロバイダーエラー、クォータ制御、信頼度、最終確認時刻、古い状態を表示します。",
    "legal.sourcesPublicTitle": "公開用のサニタイズ済みデータ",
    "legal.sourcesPublicBody":
      "公開ビューはサニタイズ済みのlive event行、ソースリンク、サニタイズ済みのプロバイダーエラー/管理者修正サマリーを読みます。プロバイダー生ペイロード、詳細なプロバイダーエラー行、管理者修正行、監査詳細、サービス認証情報はサーバーまたは管理者スコープに限定します。",
    "legal.sourcesCorrectionsTitle": "競合処理",
    "legal.sourcesCorrectionsBody":
      "まずプロバイダーIDまたはURLで重複排除し、その後制約付きのタレント時刻類似度を使います。管理者修正が優先され、YouTubeはライブ状態とURLを制御し、直接のX文脈は告知と中止を制御し、競合は表示したままにします。",
    "legal.contactHowTitle": "連絡方法",
    "legal.contactHowBody":
      "設定済みの連絡先がある場合はそれを使用してください。デモビルドでは、NEXT_PUBLIC_CONTACT_EMAILが設定されるまで連絡先未設定であることを明示します。",
    "legal.contactEvidenceTitle": "含める証拠",
    "legal.contactEvidenceBody":
      "ソースURL、対象イベント、希望する変更内容、理由、削除や権利に関わる場合は権限を確認できる連絡経路を含めてください。",
    "legal.contactAuditTitle": "管理者監査ログ",
    "legal.contactAuditBody":
      "管理者は、修正および削除判断について、実行者、対象レコード、変更フィールド、使用した証拠を監査ログに残す必要があります。",
    "legal.contactTimingTitle": "対応姿勢",
    "legal.contactTimingBody":
      "安全、プライバシー、権利に関わる高信頼度の依頼を優先して確認します。低リスクのスケジュール修正は、解決まで競合または古いラベル付きで表示できます。",
    "legal.contactPrivacyTitle": "プライバシーと削除",
    "legal.contactPrivacyBody":
      "プライバシーまたは削除依頼では、対象のローカル、Push、Supabaseレコードを特定できる情報を含めてください。匿名ローカル設定はブラウザから消去することもできます。",
    "legal.referencesTitle": "一次参照",
    "legal.referencesBody":
      "公開前、ポリシーに影響する変更前、収益化に関わる変更前に、現在のプロバイダー規約とファンポリシー参照を確認してください。",
    "legal.ref.anycolor": "ANYCOLOR 二次創作ガイドライン",
    "legal.ref.youtubeTerms": "YouTube API Services Terms",
    "legal.ref.youtubePolicies": "YouTube API Developer Policies",
    "legal.ref.xAgreement": "X Developer Agreement and Policy",
    "legal.ref.xPolicy": "X Developer Policy",
    "legal.ref.xTerms": "X Developer terms overview",
    "legal.contactEmailTitle": "連絡チャネル",
    "legal.contactEmailConfigured":
      "このビルドには、修正、プライバシー質問、削除依頼用の連絡先が設定されています。",
    "legal.contactEmailMissing":
      "デモ用の連絡先は未設定です。公開前にNEXT_PUBLIC_CONTACT_EMAILを設定してください。",
    "legal.contactMailSubject": "Oshi Command Deck correction or takedown request",
    "offline.title": "オフライン読み取り専用モード",
    "offline.body":
      "キャッシュ済みのアプリシェルを利用できます。配信データは古い可能性があるため、再接続してソースヘルスと予定を更新してください。",
    "offline.readOnlyTitle": "読み取り専用キャッシュ",
    "offline.readOnlyBody":
      "オフラインルートは、キャッシュ済みナビゲーションと最後に把握したデータを見るためだけのものです。取り込み、通知送信、管理者変更の永続化は行いません。",
    "offline.staleTitle": "再接続が必要",
    "offline.staleBody":
      "アプリが再接続し、プロバイダーヘルスを確認し、選択タイムゾーン表示を更新するまで、すべてのキャッシュ済みスケジュールを古いものとして扱ってください。",
    "offline.snapshotCoverage": "読み取り専用のキャッシュ済みスナップショットを表示中です。更新まで古い情報です。",
    "empty.streamsTitle": "配信が読み込まれていません",
    "empty.streamsBody":
      "デモ fixtures は認証情報なしで表示されます。空のままなら再試行するかビルドログを確認してください。",
    "error.boundaryTitle": "パネルの確認が必要です",
    "error.boundaryBody":
      "このパネルが復旧する間も、デッキの他の部分は利用できます。",
    "footer.trust":
      "非公式ファンダッシュボードです。リンクは元ソースを開き、メディアのダウンロードや再ホストは行いません。",
    "plural.streams.one": "{count}件の配信",
    "plural.streams.other": "{count}件の配信"
  }
} as const;

export type Locale = keyof typeof catalogs;
export type MessageKey = keyof (typeof catalogs)["en"];
