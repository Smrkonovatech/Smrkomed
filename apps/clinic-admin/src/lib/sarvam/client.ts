import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SarvamAIClient } from "sarvamai";

export interface SarvamTranscribeOptions {
  model?: "saaras:v4" | "saaras:v3" | string;
  language_code?: string;
  mode?: "transcribe" | "translate" | "verbatim" | "translit" | "codemix" | string;
  sample_rate?: number;
  with_timestamps?: boolean;
}

export interface SarvamTranscribeResult {
  transcript: string;
  language_code?: string | undefined;
  request_id?: string | undefined;
  provider: "sarvam";
  model: string;
  mode?: string | undefined;
}

export function getSarvamClient(apiKey?: string): SarvamAIClient {
  const key =
    apiKey ||
    process.env["SARVAM_API_KEY"] ||
    process.env["SARVAM_SAMVAAD_API_KEY"] ||
    "sk_l0nfgdq0_MRxkA28Stuh6JXP2AE4Anbcp";

  const client = new SarvamAIClient({
    apiSubscriptionKey: key,
  });

  const originalTranscribe = client.speechToText.transcribe.bind(client.speechToText);

  (client.speechToText as any).transcribe = function (firstArg: any, secondArg?: any) {
    if (secondArg && typeof secondArg === "object" && firstArg && !("file" in firstArg)) {
      return originalTranscribe({
        file: firstArg,
        ...secondArg,
      });
    }
    return originalTranscribe(firstArg, secondArg);
  };

  return client;
}

export async function transcribeAudioWithSarvam(
  audioSource: File | Blob | Buffer | fs.ReadStream | string,
  options?: SarvamTranscribeOptions
): Promise<SarvamTranscribeResult> {
  const client = getSarvamClient();
  const model = options?.model || "saaras:v4";
  const language_code = options?.language_code || "unknown";
  const mode = options?.mode || "translate";

  let tempFilePath: string | null = null;
  let fileStream: fs.ReadStream;

  try {
    if (typeof audioSource === "string") {
      fileStream = fs.createReadStream(audioSource);
    } else if (audioSource instanceof fs.ReadStream) {
      fileStream = audioSource;
    } else {
      let buffer: Buffer;
      let ext = "wav";

      if (typeof (audioSource as any).arrayBuffer === "function") {
        const ab = await (audioSource as Blob | File).arrayBuffer();
        buffer = Buffer.from(ab);
        if ("name" in audioSource && typeof (audioSource as File).name === "string") {
          const parts = (audioSource as File).name.split(".");
          if (parts.length > 1) ext = parts.pop() || "wav";
        }
      } else if (Buffer.isBuffer(audioSource)) {
        buffer = audioSource;
      } else {
        throw new Error("Unsupported audio source format for Sarvam AI transcription.");
      }

      tempFilePath = path.join(
        os.tmpdir(),
        `sarvam_stt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`
      );
      await fs.promises.writeFile(tempFilePath, buffer);
      fileStream = fs.createReadStream(tempFilePath);
    }

    const response = await client.speechToText.transcribe({
      file: fileStream,
      model: model as any,
      language_code: language_code as any,
      mode: mode as any,
    });

    return {
      transcript: response.transcript || "",
      language_code: response.language_code || language_code,
      request_id: response.request_id,
      provider: "sarvam",
      model,
      mode,
    };
  } finally {
    if (tempFilePath) {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch {}
    }
  }
}
