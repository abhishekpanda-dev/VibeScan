import "server-only";

import { buildFixUserPrompt, SECURITY_FIX_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { PersistedFinding } from "@/lib/scanner/types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const MAX_FIX_WORDS = 300;

type AnthropicMessageResponse = {
  content?: Array<{
    text?: string;
    type?: string;
  }>;
  error?: {
    details?: unknown;
    message?: string;
    type?: string;
  };
};

function extractMessageText(response: AnthropicMessageResponse) {
  const text = response.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");

  if (!text) {
    throw new Error("Anthropic returned an empty fix response.");
  }

  return text;
}

function limitWords(content: string, maxWords: number) {
  const words = content.trim().split(/\s+/);

  if (words.length <= maxWords) {
    return content.trim();
  }

  return `${words.slice(0, maxWords).join(" ").trim()}...`;
}

type GenerateFixInput = {
  finding: Pick<
    PersistedFinding,
    "category" | "description" | "evidence" | "location" | "severity" | "title"
  >;
  targetUrl: string;
};

export async function generateFixMarkdown({
  finding,
  targetUrl,
}: GenerateFixInput) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = DEFAULT_ANTHROPIC_MODEL;

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY.");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      max_tokens: 550,
      messages: [
        {
          content: buildFixUserPrompt({
            finding,
            targetUrl,
          }),
          role: "user",
        },
      ],
      model,
      system: SECURITY_FIX_SYSTEM_PROMPT,
      temperature: 0.2,
    }),
  });

  const payload = (await response.json()) as AnthropicMessageResponse;

  if (!response.ok) {
    const errorDetails = payload.error?.details
      ? ` Details: ${JSON.stringify(payload.error.details)}`
      : "";
    const errorType = payload.error?.type ? ` (${payload.error.type})` : "";

    throw new Error(
      payload.error?.message
        ? `Anthropic request failed for model "${model}" with status ${response.status}${errorType}: ${payload.error.message}${errorDetails}`
        : `Anthropic request failed for model "${model}" with status ${response.status}.`,
    );
  }

  return limitWords(extractMessageText(payload), MAX_FIX_WORDS);
}
