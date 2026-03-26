import { describe, expect, it } from "vitest";
import { JsonRenderer } from "../../src/presentation/renderer/json-renderer.js";
import { createRenderer } from "../../src/presentation/renderer/create-renderer.js";

describe("createRenderer", () => {
  it("returns a JsonRenderer", () => {
    expect(createRenderer()).toBeInstanceOf(JsonRenderer);
  });
});
