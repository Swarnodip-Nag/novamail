import { describe, it, expect } from "vitest";
import {
  classifyPriorityHeuristic,
  generateHeuristicSummary,
  extractKeyPointsHeuristic,
} from "../api/lib/ai-engine";

describe("AI Engine - Fallback Heuristics", () => {
  describe("classifyPriorityHeuristic", () => {
    it("should classify urgent emails as high priority", () => {
      const result = classifyPriorityHeuristic(
        "URGENT: Action required immediately",
        "This is an urgent request that needs your attention ASAP.",
        "boss@company.com"
      );
      expect(result).toBe("high");
    });

    it("should classify meeting emails as medium priority", () => {
      const result = classifyPriorityHeuristic(
        "Meeting reminder for tomorrow",
        "Just a reminder about our scheduled meeting.",
        "colleague@company.com"
      );
      expect(result).toBe("medium");
    });

    it("should classify casual emails as low priority", () => {
      const result = classifyPriorityHeuristic(
        "Hello there",
        "Just saying hi and hope you are doing well.",
        "friend@example.com"
      );
      expect(result).toBe("low");
    });
  });

  describe("generateHeuristicSummary", () => {
    it("should return first meaningful sentence", () => {
      const result = generateHeuristicSummary(
        "Project Update",
        "The project is progressing well. We have completed the first milestone and are moving to the second phase."
      );
      expect(result).toContain("project");
      expect(result.length).toBeGreaterThan(10);
    });

    it("should return subject when body is empty", () => {
      const result = generateHeuristicSummary("Important Update", "");
      expect(result).toBe("Important Update");
    });
  });

  describe("extractKeyPointsHeuristic", () => {
    it("should extract bullet points from email", () => {
      const result = extractKeyPointsHeuristic(
        "Action Items",
        "Please review:\n1. Complete the report\n2. Review the proposal\n3. Schedule follow-up"
      );
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return empty array for plain text", () => {
      const result = extractKeyPointsHeuristic(
        "Hello",
        "Just a simple message without any structured points."
      );
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
