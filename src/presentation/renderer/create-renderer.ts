import { JsonRenderer } from "./json-renderer.js";
import type { Renderer } from "./renderer.js";

export function createRenderer(): Renderer {
  return new JsonRenderer();
}
