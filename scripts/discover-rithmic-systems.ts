import WebSocket from "ws";
import { RithmicAPI } from "../server/rithmic-api.ts";

const FIELD = {
  TEMPLATE_ID: 154467,
  USER_MSG: 132760,
  RP_CODE: 132766,
  SYSTEM_NAME: 153628,
} as const;

const TEMPLATE = {
  REQUEST_RITHMIC_SYSTEM_INFO: 16,
} as const;

const TEST_SERVER_URI = "wss://rituz00100.rithmic.com:443";
const TIMEOUT_MS = 15_000;

function writeVarint(value: number): Buffer {
  const bytes: number[] = [];
  let lo = value >>> 0;
  let hi = Math.floor(value / 0x100000000);

  while (hi > 0) {
    bytes.push((lo & 0x7f) | 0x80);
    lo = ((lo >>> 7) | (hi << 25)) >>> 0;
    hi = hi >>> 7;
  }

  while (lo > 0x7f) {
    bytes.push((lo & 0x7f) | 0x80);
    lo = lo >>> 7;
  }

  bytes.push(lo & 0x7f);
  return Buffer.from(bytes);
}

function pbInt32(fieldNumber: number, value: number): Buffer {
  const tag = writeVarint((fieldNumber << 3) | 0);
  const encodedValue = writeVarint(value);
  return Buffer.concat([tag, encodedValue]);
}

function pbString(fieldNumber: number, value: string): Buffer {
  const stringBuffer = Buffer.from(value, "utf8");
  const tag = writeVarint((fieldNumber << 3) | 2);
  const length = writeVarint(stringBuffer.length);
  return Buffer.concat([tag, length, stringBuffer]);
}

interface ProtoFields {
  ints: Map<number, number[]>;
  strings: Map<number, string[]>;
}

function decodeProto(data: Buffer): ProtoFields {
  const result: ProtoFields = { ints: new Map(), strings: new Map() };
  let offset = 0;

  const readVarint = (): number => {
    let value = 0;
    let shift = 0;

    while (offset < data.length) {
      const byte = data[offset++];
      value |= (byte & 0x7f) << shift;
      shift += 7;
      if (!(byte & 0x80)) {
        break;
      }
    }

    return value;
  };

  while (offset < data.length) {
    const tag = readVarint();
    const fieldNumber = tag >>> 3;
    const wireType = tag & 0x7;

    if (wireType === 0) {
      const value = readVarint();
      if (!result.ints.has(fieldNumber)) {
        result.ints.set(fieldNumber, []);
      }
      result.ints.get(fieldNumber)!.push(value);
      continue;
    }

    if (wireType === 2) {
      const length = readVarint();
      const bytes = data.slice(offset, offset + length);
      offset += length;
      if (!result.strings.has(fieldNumber)) {
        result.strings.set(fieldNumber, []);
      }
      result.strings.get(fieldNumber)!.push(bytes.toString("utf8"));
      continue;
    }

    break;
  }

  return result;
}

function buildRequestRithmicSystemInfo(): Buffer {
  return Buffer.concat([
    pbInt32(FIELD.TEMPLATE_ID, TEMPLATE.REQUEST_RITHMIC_SYSTEM_INFO),
    pbString(FIELD.USER_MSG, "hello"),
  ]);
}

async function main(): Promise<void> {
  const api = new RithmicAPI({
    username: "unused",
    password: "",
    environment: "test",
  });

  const sslOptions = (api as any).makeSslOptions() as {
    ca: string;
    rejectUnauthorized: boolean;
  };

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let responseReceived = false;

    const ws = new WebSocket(TEST_SERVER_URI, sslOptions);

    const cleanup = () => {
      clearTimeout(timeout);
      ws.off("open", onOpen);
      ws.off("message", onMessage);
      ws.off("error", onError);
      ws.off("close", onClose);
    };

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
      }

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    const timeout = setTimeout(() => {
      finish(new Error("Timed out waiting for Rithmic system info response after 15 seconds."));
    }, TIMEOUT_MS);

    const onOpen = () => {
      ws.send(buildRequestRithmicSystemInfo());
    };

    const onMessage = (data: WebSocket.RawData) => {
      responseReceived = true;

      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      const fields = decodeProto(buffer);
      const rpCodes = fields.strings.get(FIELD.RP_CODE) ?? [];
      const systemNames = fields.strings.get(FIELD.SYSTEM_NAME) ?? [];

      if (rpCodes.includes("0")) {
        for (const systemName of systemNames) {
          console.log(systemName);
        }
      } else {
        console.log(rpCodes.join(", ") || "unknown");
      }

      finish();
    };

    const onError = (error: Error) => {
      finish(new Error(`WebSocket error: ${error.message}`));
    };

    const onClose = (code: number) => {
      if (!responseReceived) {
        finish(new Error(`Socket closed before a response was received (code=${code}).`));
      }
    };

    ws.on("open", onOpen);
    ws.on("message", onMessage);
    ws.on("error", onError);
    ws.on("close", onClose);
  });
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
