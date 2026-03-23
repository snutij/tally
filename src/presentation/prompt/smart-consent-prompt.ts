import confirm from "@inquirer/confirm";

/**
 * Prompts the user for one-time consent to download the embedding model.
 * Returns true if the user agrees; false otherwise.
 *
 * The prompt defaults to Yes because declining only defers the question to the
 * next import — there is no permanent opt-out mechanism here (use --no-smart for that).
 */
export function smartConsentPrompt(): Promise<boolean> {
  return confirm({
    default: true,
    message: "Smart categorization needs a one-time 43 MB download (all-MiniLM-L6-v2). Proceed?",
  });
}
