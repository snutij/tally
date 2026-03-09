import { HtmlRenderer } from "./html-renderer.js";
import { JsonRenderer } from "./json-renderer.js";
import type { Renderer } from "./renderer.js";

const renderers: Record<string, () => Renderer> = {
  json: () => new JsonRenderer(),
  html: () => new HtmlRenderer(),
};

export const VALID_FORMATS = Object.keys(renderers);

export function createRenderer(format: string): Renderer {
  const factory = renderers[format];
  if (!factory) {
    throw new Error(`Unknown format "${format}". Valid formats: ${VALID_FORMATS.join(", ")}`);
  }
  return factory();
}
