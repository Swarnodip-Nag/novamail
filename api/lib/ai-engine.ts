import { env } from "./env";

// ─── Types ───────────────────────────────────────────────────────
export interface AiSummaryResult {
  summary: string;
  keyPoints: string[];
  source: "ai" | "heuristic";
}

export interface AiReplyResult {
  draft: string;
  tone: string;
  source: "ai" | "template";
}

export interface AiPriorityResult {
  priority: "high" | "medium" | "low";
  reason: string;
  source: "ai" | "heuristic";
}

// ─── Configuration ───────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 25000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1000;

// ─── Gemini API ──────────────────────────────────────────────────
async function callGeminiApi(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  const apiKey = env.geminiApiKey;
  const model = env.geminiModel;

  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  // Skip empty or trivially short inputs
  if (!userPrompt || userPrompt.trim().length < 10) {
    return null;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
            topP: 0.9,
          },
          // Disable safety filters for email content (newsletters often get blocked)
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[AI] Gemini ${response.status}: ${errorBody.slice(0, 300)}`);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
          finishReason?: string;
        }>;
        promptFeedback?: { blockReason?: string };
      };

      // Check if the prompt was blocked
      if (data.promptFeedback?.blockReason) {
        console.warn(`[AI] Prompt blocked: ${data.promptFeedback.blockReason}`);
        return null;
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content || typeof content !== "string") {
        console.warn("[AI] Empty response from Gemini");
        return null;
      }

      return content.trim();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof Error && error.name === "AbortError") {
        lastError = new Error("Gemini API request timed out");
      }

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  console.warn("[AI] Gemini failed:", lastError?.message);
  return null;
}

// ─── Email Summarization ─────────────────────────────────────────
export async function summarizeEmail(
  subject: string,
  body: string,
  from: string
): Promise<AiSummaryResult> {
  // Clean the body text — strip HTML tags, URLs, and excessive whitespace
  const cleanBody = stripHtmlAndUrls(body).slice(0, 3000);
  const inputText = `Subject: ${subject}\nFrom: ${from}\n\n${cleanBody}`;

  // Only call AI if we have meaningful content
  if (cleanBody.length > 20) {
    const systemPrompt = `You are an email summarization assistant. Create a concise summary (2-3 sentences max) and extract up to 3 key points. Format your response EXACTLY as:
SUMMARY: <summary text>
KEY_POINTS:
- <point 1>
- <point 2>
- <point 3>`;

    const response = await callGeminiApi(systemPrompt, inputText);

    if (response) {
      const parsed = parseSummaryResponse(response);
      if (parsed) return { ...parsed, source: "ai" };
    }
  }

  // Fallback heuristic — always returns valid data
  return {
    summary: generateHeuristicSummary(subject, cleanBody || body),
    keyPoints: extractKeyPointsHeuristic(cleanBody || body, subject),
    source: "heuristic",
  };
}

function stripHtmlAndUrls(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")           // Strip HTML tags
    .replace(/https?:\/\/\S+/g, "")     // Strip URLs
    .replace(/\s+/g, " ")               // Collapse whitespace
    .trim();
}

function parseSummaryResponse(response: string): { summary: string; keyPoints: string[] } | null {
  try {
    const summaryMatch = response.match(/SUMMARY:\s*(.+?)(?=\nKEY_POINTS:|$)/s);
    const summary = summaryMatch?.[1]?.trim() || "";

    const keyPoints: string[] = [];
    const pointsMatch = response.match(/KEY_POINTS:\s*([\s\S]*)/);
    if (pointsMatch) {
      const pointsText = pointsMatch[1];
      const pointMatches = pointsText.matchAll(/-\s*(.+)/g);
      for (const match of pointMatches) {
        keyPoints.push(match[1].trim());
      }
    }

    if (summary) {
      return { summary, keyPoints };
    }
    return null;
  } catch {
    return null;
  }
}

export function generateHeuristicSummary(subject: string, body: string): string {
  const cleanBody = body.replace(/\s+/g, " ").trim();
  const sentences = cleanBody
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && s.length < 300);

  if (sentences.length > 0) {
    return sentences[0] + ".";
  }

  if (subject && subject !== "(No Subject)") {
    return `Email about: ${subject}`;
  }

  return "No content available to summarize.";
}

export function extractKeyPointsHeuristic(body: string, subject?: string): string[] {
  const points: string[] = [];
  const lines = body.split("\n").filter((l) => l.trim().length > 0);

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.match(/^[\d*\-•]\.?\s/) ||
      trimmed.match(/^(Please|Note|Important|Action|Deadline|URGENT)/i)
    ) {
      const point = trimmed.replace(/^[\d*\-•]\.?\s*/, "").trim();
      if (point.length > 10 && point.length < 200) {
        points.push(point);
        if (points.length >= 3) break;
      }
    }
  }

  // If no bullet points found, extract key sentences
  if (points.length === 0) {
    const sentences = body
      .replace(/\s+/g, " ")
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && s.length < 150);

    for (const s of sentences.slice(0, 2)) {
      points.push(s + ".");
    }
  }

  // Last resort: use subject
  if (points.length === 0 && subject && subject !== "(No Subject)") {
    points.push(subject);
  }

  return points;
}

// ─── Reply Draft Generation ──────────────────────────────────────
export async function generateReplyDraft(
  subject: string,
  body: string,
  from: string,
  to: string,
  tone: "professional" | "friendly" | "brief" = "professional"
): Promise<AiReplyResult> {
  const cleanBody = stripHtmlAndUrls(body).slice(0, 2000);

  const toneInstructions: Record<string, string> = {
    professional: "Use a formal, courteous tone. Be clear and direct.",
    friendly: "Use a warm, approachable tone while remaining professional.",
    brief: "Keep it very short and to the point.",
  };

  if (cleanBody.length > 20) {
    const systemPrompt = `You are an email reply assistant. Write a professional reply draft based on the received email. ${toneInstructions[tone]}

Format your response as a plain email reply (no subject line, no signatures). Keep it concise (3-5 sentences typically).`;

    const userPrompt = `Original email from ${from}:\nSubject: ${subject}\n\n${cleanBody}\n\nDraft a reply from ${to}:`;

    const response = await callGeminiApi(systemPrompt, userPrompt);

    if (response) {
      return {
        draft: response,
        tone,
        source: "ai",
      };
    }
  }

  // Fallback template-based reply
  return {
    draft: generateTemplateReply(subject, from, tone),
    tone,
    source: "template",
  };
}

function generateTemplateReply(
  subject: string,
  from: string,
  tone: string
): string {
  const sender = from.split("<")[0].trim() || "there";

  const templates: Record<string, string[]> = {
    professional: [
      `Thank you for your email${subject && subject !== "(No Subject)" ? ' regarding "' + subject + '"' : ""}. I will review this and get back to you shortly.`,
      `Thanks for reaching out. I'll look into this and respond as soon as possible.`,
      `I appreciate you contacting me about this matter. I'll respond with more details soon.`,
    ],
    friendly: [
      `Thanks for your email! I'll check this out and get back to you soon.`,
      `Hey ${sender}, thanks for sending this over! I'll take a look and follow up.`,
      `Got it, thanks! I'll respond with more info shortly.`,
    ],
    brief: [
      `Received. Will follow up shortly.`,
      `Noted. I'll respond soon.`,
      `Thanks. Checking now.`,
    ],
  };

  const toneTemplates = templates[tone] || templates.professional;
  return toneTemplates[Math.floor(Math.random() * toneTemplates.length)];
}

// ─── Priority Classification ─────────────────────────────────────
export async function classifyPriority(
  subject: string,
  body: string,
  from: string
): Promise<AiPriorityResult> {
  const cleanBody = stripHtmlAndUrls(body).slice(0, 2000);
  const text = `${subject} ${cleanBody}`;

  if (text.length > 20) {
    const systemPrompt = `Classify the priority of this email as HIGH, MEDIUM, or LOW based on urgency and importance. Respond with ONLY the priority level and a brief reason.

Format:
PRIORITY: <HIGH|MEDIUM|LOW>
REASON: <one sentence explanation>`;

    const userPrompt = `From: ${from}\nSubject: ${subject}\n\n${cleanBody}`;

    const response = await callGeminiApi(systemPrompt, userPrompt);

    if (response) {
      const parsed = parsePriorityResponse(response);
      if (parsed) return { ...parsed, source: "ai" };
    }
  }

  // Fallback heuristic
  return {
    priority: classifyPriorityHeuristic(subject, body, from),
    reason: "Classified using keyword-based heuristics.",
    source: "heuristic",
  };
}

function parsePriorityResponse(response: string): { priority: "high" | "medium" | "low"; reason: string } | null {
  try {
    const priorityMatch = response.match(/PRIORITY:\s*(HIGH|MEDIUM|LOW)/i);
    const reasonMatch = response.match(/REASON:\s*(.+?)(?=\n|$)/is);

    if (priorityMatch) {
      const priority = priorityMatch[1].toLowerCase() as "high" | "medium" | "low";
      const reason = reasonMatch?.[1]?.trim() || "AI-classified priority.";
      return { priority, reason };
    }
    return null;
  } catch {
    return null;
  }
}

export function classifyPriorityHeuristic(
  subject: string,
  body: string,
  _from: string
): "high" | "medium" | "low" {
  const text = `${subject} ${body}`.toLowerCase();

  const highKeywords = [
    "urgent",
    "asap",
    "immediately",
    "critical",
    "deadline",
    "action required",
    "time-sensitive",
    "emergency",
    "overdue",
    "expires",
    "final notice",
    "important:",
  ];

  const mediumKeywords = [
    "please review",
    "feedback",
    "update",
    "follow up",
    "meeting",
    "schedule",
    "reminder",
    "pending",
  ];

  for (const keyword of highKeywords) {
    if (text.includes(keyword)) return "high";
  }

  for (const keyword of mediumKeywords) {
    if (text.includes(keyword)) return "medium";
  }

  return "low";
}
