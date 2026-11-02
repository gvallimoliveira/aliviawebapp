// Current non-deprecated model; image input + zero-retention chat surface verified.
export const VISION_MODEL = "google/gemini-3.8-flash";

export function visionRequest(instructions: string, image: string, text: string, name: string, schema: unknown, stream: boolean) {
  return {
    model: VISION_MODEL,
    stream,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: [{ type: "text", text }, { type: "image_url", image_url: { url: image } }] },
    ],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
  };
}