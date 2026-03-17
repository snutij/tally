import {
  DEFAULT_SPENDING_TARGETS,
  SpendingTargets,
} from "../../src/domain/config/spending-targets.js";
import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/domain/error/index.js";

describe("SpendingTargets", () => {
  describe("create()", () => {
    it("creates valid spending targets", () => {
      const targets = SpendingTargets.create({ invest: 20, needs: 50, wants: 30 });
      expect(targets.needs).toBe(50);
      expect(targets.wants).toBe(30);
      expect(targets.invest).toBe(20);
    });

    it("accepts zero values when sum is 100", () => {
      const targets = SpendingTargets.create({ invest: 0, needs: 100, wants: 0 });
      expect(targets.needs).toBe(100);
    });

    it("throws DomainError when sum is not 100", () => {
      expect(() => SpendingTargets.create({ invest: 10, needs: 50, wants: 30 })).toThrow(
        DomainError,
      );
    });

    it("throws DomainError for negative needs", () => {
      expect(() => SpendingTargets.create({ invest: 50, needs: -10, wants: 60 })).toThrow(
        DomainError,
      );
    });

    it("throws DomainError for negative wants", () => {
      expect(() => SpendingTargets.create({ invest: 50, needs: 60, wants: -10 })).toThrow(
        DomainError,
      );
    });

    it("throws DomainError for negative invest", () => {
      expect(() => SpendingTargets.create({ invest: -10, needs: 60, wants: 50 })).toThrow(
        DomainError,
      );
    });

    it("throws DomainError for needs > 100", () => {
      expect(() => SpendingTargets.create({ invest: 0, needs: 110, wants: 0 })).toThrow(
        DomainError,
      );
    });

    it("throws DomainError for wants > 100", () => {
      expect(() => SpendingTargets.create({ invest: 0, needs: 0, wants: 110 })).toThrow(
        DomainError,
      );
    });

    it("throws DomainError for invest > 100", () => {
      expect(() => SpendingTargets.create({ invest: 110, needs: 0, wants: 0 })).toThrow(
        DomainError,
      );
    });
  });

  describe("DEFAULT_SPENDING_TARGETS", () => {
    it("is a valid SpendingTargets instance (50/30/20 rule)", () => {
      expect(DEFAULT_SPENDING_TARGETS).toBeInstanceOf(SpendingTargets);
      expect(DEFAULT_SPENDING_TARGETS.needs).toBe(50);
      expect(DEFAULT_SPENDING_TARGETS.wants).toBe(30);
      expect(DEFAULT_SPENDING_TARGETS.invest).toBe(20);
    });
  });
});
