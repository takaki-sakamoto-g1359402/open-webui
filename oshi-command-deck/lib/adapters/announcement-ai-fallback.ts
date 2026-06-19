import { parseAnnouncementText, type ParsedAnnouncement } from "@/lib/domain/parsing";

export type AnnouncementAiFallbackStatus =
  | "not_needed"
  | "not_configured"
  | "used"
  | "invalid"
  | "failed";

export type ParsedAnnouncementWithFallback = ParsedAnnouncement & {
  aiFallback?: {
    status: AnnouncementAiFallbackStatus;
    model?: string;
    reason?: string;
    evidence: string[];
  };
};

type AiCandidateValue<T> = {
  value: T;
  evidence: string;
};

type AiAnnouncementCandidate = {
  urls?: Array<AiCandidateValue<string>>;
  collaborators?: Array<AiCandidateValue<string>>;
  tbd?: AiCandidateValue<boolean>;
  scheduledStartUtc?: AiCandidateValue<string>;
};

type OpenAiResponseBody = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const officialOpenAiResponsesUrl = "https://api.openai.com/v1/responses";

export async function parseAnnouncementTextWithAiFallback(
  text: string,
  now = new Date(),
  defaultTimezone = "Asia/Tokyo"
): Promise<ParsedAnnouncementWithFallback> {
  const deterministic = parseAnnouncementText(text, now, defaultTimezone);
  if (!needsAiFallback(text, deterministic)) {
    return {
      ...deterministic,
      aiFallback: {
        status: "not_needed",
        evidence: []
      }
    };
  }

  const config = getAiFallbackConfig();
  if (!config.configured) {
    return {
      ...deterministic,
      aiFallback: {
        status: "not_configured",
        reason: config.reason,
        evidence: []
      }
    };
  }

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(buildOpenAiRequestBody(text, now, defaultTimezone, config.model))
    });
    const body = (await response.json().catch(() => ({}))) as OpenAiResponseBody;

    if (!response.ok) {
      return {
        ...deterministic,
        aiFallback: {
          status: "failed",
          model: config.model,
          reason: body.error?.message ?? `OpenAI Responses API returned HTTP ${response.status}.`,
          evidence: []
        }
      };
    }

    const candidate = parseAiCandidate(body);
    const merged = mergeValidatedCandidate(text, deterministic, candidate);
    if (!merged.used) {
      return {
        ...deterministic,
        aiFallback: {
          status: "invalid",
          model: config.model,
          reason: merged.reason,
          evidence: merged.evidence
        }
      };
    }

    return {
      ...merged.parsed,
      aiFallback: {
        status: "used",
        model: config.model,
        evidence: merged.evidence
      }
    };
  } catch (error) {
    return {
      ...deterministic,
      aiFallback: {
        status: "failed",
        model: config.model,
        reason: error instanceof Error ? error.message : "AI fallback request failed.",
        evidence: []
      }
    };
  }
}

export function isAnnouncementAiFallbackConfigured() {
  return getAiFallbackConfig().configured;
}

function getAiFallbackConfig():
  | {
      configured: true;
      apiKey: string;
      model: string;
      url: string;
    }
  | {
      configured: false;
      reason: "disabled" | "missing_api_key" | "missing_model" | "invalid_endpoint";
    } {
  if (process.env.AI_PARSE_FALLBACK_ENABLED !== "true") {
    return { configured: false, reason: "disabled" };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { configured: false, reason: "missing_api_key" };
  }

  const model = process.env.OPENAI_MODEL?.trim();
  if (!model) {
    return { configured: false, reason: "missing_model" };
  }
  const url = getOpenAiResponsesUrl();
  if (!url) {
    return { configured: false, reason: "invalid_endpoint" };
  }

  return {
    configured: true,
    apiKey,
    model,
    url
  };
}

function getOpenAiResponsesUrl() {
  const configuredUrl = process.env.OPENAI_RESPONSES_URL?.trim();
  if (!configuredUrl) {
    return officialOpenAiResponsesUrl;
  }
  return configuredUrl === officialOpenAiResponsesUrl ? configuredUrl : undefined;
}

function needsAiFallback(text: string, parsed: ParsedAnnouncement) {
  const hasTimeSignal =
    /\b(today|tomorrow|tonight)\b|今日|本日|今夜|明日|明後日|\d{1,2}\s*(?:am|pm)\s*(?:JST|UTC)?|\d{1,2}[:：時]\d{0,2}\s*(JST|UTC)?|20\d{2}[-/]\d{1,2}[-/]\d{1,2}/iu.test(
      text
    );
  const hasCollaboratorSignal = /with|collab|コラボ|参加者|参加/iu.test(text);
  const hasTbdSignal = /TBD|TBA|未定|時間未定|後日/iu.test(text);

  return (
    (hasTimeSignal && !parsed.scheduledStartUtc) ||
    (hasCollaboratorSignal && parsed.collaborators.length === 0) ||
    (hasTbdSignal && !parsed.tbd)
  );
}

function buildOpenAiRequestBody(
  text: string,
  now: Date,
  defaultTimezone: string,
  model: string
) {
  return {
    model,
    input: [
      {
        role: "system",
        content:
          "Extract only livestream schedule facts that are explicitly supported by the user's announcement text. Do not infer identities, sources, or missing facts. Every non-null field must include a short evidence quote copied from the announcement."
      },
      {
        role: "user",
        content: [
          `Now UTC: ${now.toISOString()}`,
          `Default timezone: ${defaultTimezone}`,
          "Return only supported facts. If a fact is absent, omit it.",
          "Announcement:",
          text
        ].join("\n")
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "announcement_parse_candidate",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            urls: {
              type: "array",
              items: candidateStringSchema()
            },
            collaborators: {
              type: "array",
              items: candidateStringSchema()
            },
            tbd: {
              type: ["object", "null"],
              additionalProperties: false,
              properties: {
                value: { type: "boolean" },
                evidence: { type: "string" }
              },
              required: ["value", "evidence"]
            },
            scheduledStartUtc: {
              type: ["object", "null"],
              additionalProperties: false,
              properties: {
                value: { type: "string" },
                evidence: { type: "string" }
              },
              required: ["value", "evidence"]
            }
          },
          required: ["urls", "collaborators", "tbd", "scheduledStartUtc"]
        }
      }
    },
    max_output_tokens: 700
  };
}

function candidateStringSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      value: { type: "string" },
      evidence: { type: "string" }
    },
    required: ["value", "evidence"]
  };
}

function parseAiCandidate(body: OpenAiResponseBody): AiAnnouncementCandidate | undefined {
  const text =
    body.output_text ??
    body.output?.flatMap((item) => item.content ?? []).find((content) => content.text)?.text;
  if (!text) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as AiAnnouncementCandidate;
  } catch {
    return undefined;
  }
}

function mergeValidatedCandidate(
  text: string,
  deterministic: ParsedAnnouncement,
  candidate: AiAnnouncementCandidate | undefined
):
  | {
      used: true;
      parsed: ParsedAnnouncement;
      evidence: string[];
    }
  | {
      used: false;
      reason: string;
      evidence: string[];
    } {
  if (!candidate) {
    return { used: false, reason: "missing_or_invalid_json", evidence: [] };
  }

  const evidence: string[] = [];
  const urls = [...deterministic.urls];
  const collaborators = [...deterministic.collaborators];
  let tbd = deterministic.tbd;
  let scheduledStartUtc = deterministic.scheduledStartUtc;

  for (const item of candidate.urls ?? []) {
    if (isEvidenceBacked(text, item.evidence) && isUrlInText(text, item.value) && !urls.includes(item.value)) {
      urls.push(item.value);
      evidence.push(item.evidence);
    }
  }

  for (const item of candidate.collaborators ?? []) {
    const name = item.value.trim();
    if (
      name.length > 1 &&
      name.length <= 80 &&
      isEvidenceBacked(text, item.evidence) &&
      !collaborators.some((value) => value.toLowerCase() === name.toLowerCase())
    ) {
      collaborators.push(name);
      evidence.push(item.evidence);
    }
  }

  if (!tbd && candidate.tbd?.value === true && isEvidenceBacked(text, candidate.tbd.evidence)) {
    tbd = true;
    evidence.push(candidate.tbd.evidence);
  }

  const aiDate = candidate.scheduledStartUtc;
  if (!scheduledStartUtc && aiDate && isEvidenceBacked(text, aiDate.evidence)) {
    const date = new Date(aiDate.value);
    if (!Number.isNaN(date.getTime())) {
      scheduledStartUtc = date.toISOString().replace(/\.\d{3}Z$/, "Z");
      evidence.push(aiDate.evidence);
    }
  }

  if (
    urls.length === deterministic.urls.length &&
    collaborators.length === deterministic.collaborators.length &&
    tbd === deterministic.tbd &&
    scheduledStartUtc === deterministic.scheduledStartUtc
  ) {
    return { used: false, reason: "no_valid_grounded_fields", evidence };
  }

  return {
    used: true,
    parsed: {
      urls,
      collaborators: collaborators.slice(0, 12),
      tbd,
      scheduledStartUtc,
      evidence: [...new Set([...deterministic.evidence, "ai-fallback"])]
    },
    evidence: [...new Set(evidence)]
  };
}

function isEvidenceBacked(text: string, evidence: string) {
  const normalizedEvidence = normalizeForEvidence(evidence);
  if (normalizedEvidence.length < 2) {
    return false;
  }
  return normalizeForEvidence(text).includes(normalizedEvidence);
}

function isUrlInText(text: string, value: string) {
  try {
    const url = new URL(value);
    return text.includes(value) || text.includes(url.toString());
  } catch {
    return false;
  }
}

function normalizeForEvidence(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}
