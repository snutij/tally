import { describe, expect, it } from "vitest";
import { createRenderer } from "../../src/presentation/renderer/create-renderer.js";
import { JsonRenderer } from "../../src/presentation/renderer/json-renderer.js";
import { HtmlRenderer } from "../../src/presentation/renderer/html-renderer.js";

describe("createRenderer", () => {
  it("returns JsonRenderer for 'json'", () => {
    expect(createRenderer("json")).toBeInstanceOf(JsonRenderer);
  });

  it("returns HtmlRenderer for 'html'", () => {
    expect(createRenderer("html")).toBeInstanceOf(HtmlRenderer);
  });

  it("throws on unknown format", () => {
    expect(() => createRenderer("foo")).toThrow('Unknown format "foo". Valid formats: html, json');
  });
});
