/**
 * Stub AI client for local LLM integration.
 * Target: http://192.168.9.55:30068/v1  (OpenAI-compatible API)
 * Model:  llama3.2:latest
 */

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCompletionResponse {
  id: string;
  choices: Array<{
    message: AiChatMessage;
    finish_reason: string;
  }>;
}

export class AiClient {
  private baseUrl: string;
  private model: string;

  constructor(
    baseUrl: string = "http://192.168.9.55:30068/v1",
    model: string = "llama3.2:latest",
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.model = model;
  }

  /**
   * Send a chat completion request (OpenAI-compatible format).
   * @throws Error - Not implemented yet
   */
  async chatCompletion(
    _messages: AiChatMessage[],
    _options?: { temperature?: number; max_tokens?: number },
  ): Promise<AiCompletionResponse> {
    throw new Error(
      "AiClient.chatCompletion is not implemented. " +
        `Configure endpoint at ${this.baseUrl} with model ${this.model}.`,
    );
  }

  /**
   * Parse a raw text (SMS/voice) into a structured transaction intent.
   * @throws Error - Not implemented yet
   */
  async parseTransaction(
    _text: string,
  ): Promise<{
    type: "withdrawal" | "deposit" | "transfer";
    amount?: number;
    category?: string;
    merchant?: string;
    description?: string;
  }> {
    throw new Error(
      "AiClient.parseTransaction is not implemented. " +
        "Requires local LLM endpoint to be running.",
    );
  }

  /**
   * Suggest a category for a transaction description.
   * @throws Error - Not implemented yet
   */
  async categorize(
    _description: string,
  ): Promise<{ category: string; confidence: number }> {
    throw new Error(
      "AiClient.categorize is not implemented. " +
        "Requires local LLM endpoint to be running.",
    );
  }
}

/** Singleton instance with default config. */
export const aiClient = new AiClient();
