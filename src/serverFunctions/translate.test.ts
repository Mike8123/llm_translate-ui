import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Capture the validator and handler from createServerFn chain
let capturedValidator: (data: unknown) => unknown;
let capturedHandler: (ctx: { data: unknown }) => Promise<unknown>;

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: (fn: (data: unknown) => unknown) => {
      capturedValidator = fn;
      return {
        handler: (fn: (ctx: { data: unknown }) => Promise<unknown>) => {
          capturedHandler = fn;
          return fn;
        },
      };
    },
  }),
}));

// Import after mock setup so the module executes with our mock
await import("./translate");

describe("translate input validator", () => {
  it("accepts valid input", () => {
    const result = capturedValidator({
      text: "Hello",
      sourceLanguage: "en",
      targetLanguage: "de_DE",
    });

    expect(result).toEqual({
      text: "Hello",
      sourceLanguage: "en",
      targetLanguage: "de_DE",
    });
  });

  it("accepts optional model parameter", () => {
    const result = capturedValidator({
      text: "Hello",
      sourceLanguage: "en",
      targetLanguage: "de_DE",
      model: "custom-model",
    });

    expect(result).toEqual({
      text: "Hello",
      sourceLanguage: "en",
      targetLanguage: "de_DE",
      model: "custom-model",
    });
  });

  it("trims source and target language codes", () => {
    const result = capturedValidator({
      text: "Hello",
      sourceLanguage: "  en  ",
      targetLanguage: "  de_DE  ",
    });

    expect(result).toEqual({
      text: "Hello",
      sourceLanguage: "en",
      targetLanguage: "de_DE",
    });
  });

  it("throws on null input", () => {
    expect(() => capturedValidator(null)).toThrow("Invalid input");
  });

  it("throws on non-object input", () => {
    expect(() => capturedValidator("string")).toThrow("Invalid input");
    expect(() => capturedValidator(42)).toThrow("Invalid input");
  });

  it("throws when text is missing", () => {
    expect(() => capturedValidator({ sourceLanguage: "en", targetLanguage: "de_DE" })).toThrow(
      "Text is required"
    );
  });

  it("throws when text is empty", () => {
    expect(() =>
      capturedValidator({ text: "   ", sourceLanguage: "en", targetLanguage: "de_DE" })
    ).toThrow("Text is required");
  });

  it("throws when text is not a string", () => {
    expect(() =>
      capturedValidator({ text: 123, sourceLanguage: "en", targetLanguage: "de_DE" })
    ).toThrow("Text is required");
  });

  it("throws when sourceLanguage is missing", () => {
    expect(() => capturedValidator({ text: "Hello", targetLanguage: "de_DE" })).toThrow(
      "Source language is required"
    );
  });

  it("throws when sourceLanguage is empty", () => {
    expect(() =>
      capturedValidator({ text: "Hello", sourceLanguage: "  ", targetLanguage: "de_DE" })
    ).toThrow("Source language is required");
  });

  it("throws when targetLanguage is missing", () => {
    expect(() => capturedValidator({ text: "Hello", sourceLanguage: "en" })).toThrow(
      "Target language is required"
    );
  });

  it("throws when targetLanguage is empty", () => {
    expect(() =>
      capturedValidator({ text: "Hello", sourceLanguage: "en", targetLanguage: "" })
    ).toThrow("Target language is required");
  });

  it("ignores non-string model", () => {
    const result = capturedValidator({
      text: "Hello",
      sourceLanguage: "en",
      targetLanguage: "de_DE",
      model: 123,
    });

    expect(result).toEqual({
      text: "Hello",
      sourceLanguage: "en",
      targetLanguage: "de_DE",
    });
  });
});

describe("translate handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls LM Studio API and returns translation", async () => {
    const mockResponse = {
      model: "google/translategemma-27b-it",
      choices: [
        { index: 0, message: { role: "assistant", content: "  Hallo Welt  " }, finish_reason: "stop" },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const result = await capturedHandler({
      data: { text: "Hello World", sourceLanguage: "en", targetLanguage: "de_DE" },
    });

    expect(result).toEqual({
      translation: "Hallo Welt",
      model: "google/translategemma-27b-it",
      stats: null,
    });

    // Verify fetch was called with correct URL and body
    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = (fetch as Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:1234/v1/chat/completions");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });

    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body["model"]).toBe("google/translategemma-27b-it");
    expect(body["messages"]).toEqual([
      { role: "user", content: expect.stringContaining("Hello World") },
    ]);
    expect((body["temperature"] as number)).toBe(0.1);
    expect((body["max_tokens"] as number)).toBe(4096);
  });

  it("uses custom model when provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            model: "custom-model",
            choices: [{ index: 0, message: { role: "assistant", content: "translated" }, finish_reason: null }],
          }),
      })
    );

    await capturedHandler({
      data: {
        text: "Hello",
        sourceLanguage: "en",
        targetLanguage: "de_DE",
        model: "custom-model",
      },
    });

    const body = JSON.parse(
      ((fetch as Mock).mock.calls[0] as [string, RequestInit])[1].body as string
    ) as Record<string, unknown>;
    expect(body["model"]).toBe("custom-model");
  });

  it("throws on non-200 API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      })
    );

    await expect(
      capturedHandler({
        data: { text: "Hello", sourceLanguage: "en", targetLanguage: "de_DE" },
      })
    ).rejects.toThrow("LM Studio API error: 500 - Internal Server Error");
  });

  it("throws on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fetch failed")));

    await expect(
      capturedHandler({
        data: { text: "Hello", sourceLanguage: "en", targetLanguage: "de_DE" },
      })
    ).rejects.toThrow("fetch failed");
  });

  it("passes an AbortSignal to fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            model: "google/translategemma-27b-it",
            choices: [{ index: 0, message: { role: "assistant", content: "result" }, finish_reason: null }],
          }),
      })
    );

    await capturedHandler({
      data: { text: "Hello", sourceLanguage: "en", targetLanguage: "de_DE" },
    });

    const options = ((fetch as Mock).mock.calls[0] as [string, RequestInit])[1];
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("handles response with empty choices", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            model: "google/translategemma-27b-it",
            choices: [],
          }),
      })
    );

    const result = await capturedHandler({
      data: { text: "Hello", sourceLanguage: "en", targetLanguage: "de_DE" },
    });

    expect(result).toEqual({
      translation: "",
      model: "google/translategemma-27b-it",
      stats: null,
    });
  });

  it("trims whitespace from response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            model: "google/translategemma-27b-it",
            choices: [{ index: 0, message: { role: "assistant", content: "\n  translated text  \n" }, finish_reason: null }],
          }),
      })
    );

    const result = (await capturedHandler({
      data: { text: "Hello", sourceLanguage: "en", targetLanguage: "de_DE" },
    })) as { translation: string };

    expect(result.translation).toBe("translated text");
  });
});
