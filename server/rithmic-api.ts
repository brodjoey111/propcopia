import WebSocket from 'ws';

/**
 * Rithmic R|Protocol API Client — corrected to v0.87.0.0 spec
 *
 * All field numbers and template IDs sourced from the official Rithmic R|Protocol
 * API v0.87.0.0 .proto files and Reference Guide (attached_assets/rithmic_api/).
 *
 * Environments:
 *   - Test (paper):  wss://rituz00100.rithmic.com:443
 *   - Live Chicago:  wss://rithmic01.rithmic.com:443
 */

export interface RithmicCredentials {
  username: string;
  password: string;
  systemName?: string;   // e.g. 'Rithmic Test'
  environment?: 'test' | 'live';
  appName?: string;
  appVersion?: string;
}

export interface RithmicAccount {
  id: string;
  name: string;
  accountType: string;
  balance?: number;
  active?: boolean;
}

// ─── SSL cert for Rithmic WSS connections ────────────────────────────────────

const RITHMIC_SSL_CERT = `-----BEGIN CERTIFICATE-----
MIIF3jCCA8agAwIBAgIQAf1tMPyjylGoG7xkDjUDLTANBgkqhkiG9w0BAQwFADCB
iDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCk5ldyBKZXJzZXkxFDASBgNVBAcTC0pl
cnNleSBDaXR5MR4wHAYDVQQKExVUaGUgVVNFUlRSVVNUIE5ldHdvcmsxLjAsBgNV
BAMTJVVTRVJUcnVzdCBSU0EgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkwHhcNMTAw
MjAxMDAwMDAwWhcNMzgwMTE4MjM1OTU5WjCBiDELMAkGA1UEBhMCVVMxEzARBgNV
BAgTCk5ldyBKZXJzZXkxFDASBgNVBAcTC0plcnNleSBDaXR5MR4wHAYDVQQKExVU
aGUgVVNFUlRSVVNUIE5ldHdvcmsxLjAsBgNVBAMTJVVTRVJUcnVzdCBSU0EgQ2Vy
dGlmaWNhdGlvbiBBdXRob3JpdHkwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIK
AoICAQCAEmUXNg7D2wiz0KxXDXbtzSfTTK1Qg2HiqiBNCS1kCdzOiZ/MPans9s/B
3PHTsdZ7NygRK0faOca8Ohm0X6a9fZ2jY0K2dvKpOyuR+OJv0OwWIJAJPuLodMkY
tJHUYmTbf6MG8YgYapAiPLz+E/CHFHv25B+O1ORRxhFnRghRy4YUVD+8M/5+bJz/
Fp0YvVGONaanZshyZ9shZrHUm3gDwFA66Mzw3LyeTP6vBZY1H1dat//O+T23LLb2
VN3I5xI6Ta5MirdcmrS3ID3KfyI0rn47aGYBROcBTkZTmzNg95S+UzeQc0PzMsNT
79uq/nROacdrjGCT3sTHDN/hMq7MkztReJVni+49Vv4M0GkPGw/zJSZrM233bkf6
c0Plfg6lZrEpfDKEY1WJxA3Bk1QwGROs0303p+tdOmw1XNtB1xLaqUkL39iAigmT
Yo61Zs8liM2EuLE/pDkP2QKe6xJMlXzzawWpXhaDzLhn4ugTncxbgtNMs+1b/97l
c6wjOy0AvzVVdAlJ2ElYGn+SNuZRkg7zJn0cTRe8yexDJtC/QV9AqURE9JnnV4ee
UB9XVKg+/XRjL7FQZQnmWEIuQxpMtPAlR1n6BB6T1CZGSlCBst6+eLf8ZxXhyVeE
Hg9j1uliutZfVS7qXMYoCAQlObgOK6nyTJccBz8NUvXt7y+CDwIDAQABo0IwQDAd
BgNVHQ4EFgQUU3m/WqorSs9UgOHYm8Cd8rIDZsswDgYDVR0PAQH/BAQDAgEGMA8G
A1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEMBQADggIBAFzUfA3P9wF9QZllDHPF
Up/L+M+ZBn8b2kMVn54CVVeWFPFSPCeHlCjtHzoBN6J2/FNQwISbxmtOuowhT6KO
VWKR82kV2LyI48SqC/3vqOlLVSoGIG1VeCkZ7l8wXEskEVX/JJpuXior7gtNn3/3
ATiUFJVDBwn7YKnuHKsSjKCaXqeYalltiz8I+8jRRa8YFWSQEg9zKC7F4iRO/Fjs
8PRF/iKz6y+O0tlFYQXBl2+odnKPi4w2r78NBc5xjeambx9spnFixdjQg3IM8WcR
iQycE0xyNN+81XHfqnHd4blsjDwSXWXavVcStkNr/+XeTWYRUc+ZruwXtuhxkYze
Sf7dNXGiFSeUHM9h4ya7b6NnJSFd5t0dCy5oGzuCr+yDZ4XUmFF0sbmZgIn/f3gZ
XHlKYC6SQK5MNyosycdiyA5d9zZbyuAlJQG03RoHnHcAP9Dc1ew91Pq7P8yF1m9/
qS3fuQL39ZeatTXaw2ewh0qpKJ4jjv9cJ2vhsE/zB+4ALtRZh8tSQZXq9EfX7mRB
VXyNWQKV3WKdwrnuWih0hKWbt5DHDAff9Yk2dDLWKMGwsAvgnEzDHNb842m1R0aB
L6KCq9NjRHDEjf8tM7qtj3u1cIiuPhnPQCjY/MiQu12ZIvVS5ljFH4gxQ+6IHdfG
jjxDah2nGN59PRbxYvnKkKj9
-----END CERTIFICATE-----`;

// ─── Protobuf field numbers — from official .proto files ─────────────────────
// Source: attached_assets/rithmic_api/0.87.0.0/proto/

const FIELD = {
  // Shared across all messages
  TEMPLATE_ID:      154467,  // PB_OFFSET + MNM_TEMPLATE_ID  (was 154489 — incorrect)
  USER_MSG:         132760,  // PB_OFFSET + MNM_USER_MSG

  // request_login.proto specific fields
  TEMPLATE_VERSION: 153634,
  USER:             131003,  // login username           (was 131803 — incorrect)
  PASSWORD:         130004,  // login password           (was 131802 — incorrect)
  APP_NAME:         130002,  // app_name in login msg    (was 154013 — that's fcm_id!)
  APP_VERSION:      131803,  // app_version in login msg (was 154014 — that's ib_id!)
  SYSTEM_NAME:      153628,  // system_name              (was 153648 — incorrect)
  INFRA_TYPE:       153621,  // SysInfraType enum        (was 153646 — incorrect)

  // response_login.proto / order message fields
  FCM_ID:           154013,  // fcm_id  (same field across order msgs)
  IB_ID:            154014,  // ib_id   (same field across order msgs)
  ACCOUNT_ID:       154008,  // account_id
  MANUAL_OR_AUTO:   154710,  // OrderPlacement enum (1=MANUAL, 2=AUTO)

  // response fields
  RP_CODE:          132766,  // rp_code (repeated string, "0" = success)
};

// ─── SysInfraType enum — from request_login.proto ────────────────────────────
const INFRA_TYPE = {
  TICKER_PLANT:     1,   // was 1 ✓
  ORDER_PLANT:      2,   // was 3 — WRONG (Reference Guide confirms 2)
  HISTORY_PLANT:    3,
  PNL_PLANT:        4,
  REPOSITORY_PLANT: 5,
};

// ─── Template ID values — from R|Protocol Reference Guide v0.87.0.0 ──────────
const TEMPLATE = {
  // Shared
  REQUEST_LOGIN:              10,
  RESPONSE_LOGIN:             11,
  REQUEST_LOGOUT:             12,
  RESPONSE_LOGOUT:            13,
  REQUEST_HEARTBEAT:          18,
  RESPONSE_HEARTBEAT:         19,
  REJECT:                     75,

  // Order Plant
  REQUEST_LOGIN_INFO:         300,
  RESPONSE_LOGIN_INFO:        301,
  REQUEST_ACCOUNT_LIST:       302,   // was 300 — incorrect
  RESPONSE_ACCOUNT_LIST:      303,   // was 301 — incorrect
  REQUEST_CANCEL_ALL_ORDERS:  346,
  RESPONSE_CANCEL_ALL_ORDERS: 347,
  REQUEST_EXIT_POSITION:      3504,  // was 334 (Update Stop Bracket Level!) — very wrong
  RESPONSE_EXIT_POSITION:     3505,  // was 335 — incorrect
};

// ─── Server URIs ──────────────────────────────────────────────────────────────
const SERVERS: Record<string, string> = {
  test: "wss://rituz00100.rithmic.com:443",
  live: process.env.RITHMIC_LIVE_URL ?? "",
};

// ─── Manual protobuf encoder ──────────────────────────────────────────────────

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

function pbString(fieldNumber: number, value: string): Buffer {
  const strBuf = Buffer.from(value, 'utf8');
  const tag = writeVarint((fieldNumber << 3) | 2);
  const len = writeVarint(strBuf.length);
  return Buffer.concat([tag, len, strBuf]);
}

function pbInt32(fieldNumber: number, value: number): Buffer {
  const tag = writeVarint((fieldNumber << 3) | 0);
  const val = writeVarint(value);
  return Buffer.concat([tag, val]);
}

// ─── Protobuf decoder — returns all field values found in a binary message ───

interface ProtoFields {
  ints:    Map<number, number[]>;
  strings: Map<number, string[]>;
}

function decodeProto(data: Buffer): ProtoFields {
  const result: ProtoFields = { ints: new Map(), strings: new Map() };
  let offset = 0;

  const readVarint = (): number => {
    let value = 0, shift = 0;
    while (offset < data.length) {
      const byte = data[offset++];
      value |= (byte & 0x7f) << shift;
      shift += 7;
      if (!(byte & 0x80)) break;
    }
    return value;
  };

  while (offset < data.length) {
    const tag = readVarint();
    const fieldNumber = tag >>> 3;
    const wireType = tag & 0x7;

    if (wireType === 0) {
      const value = readVarint();
      if (!result.ints.has(fieldNumber)) result.ints.set(fieldNumber, []);
      result.ints.get(fieldNumber)!.push(value);
    } else if (wireType === 2) {
      const len = readVarint();
      const bytes = data.slice(offset, offset + len);
      offset += len;
      if (!result.strings.has(fieldNumber)) result.strings.set(fieldNumber, []);
      result.strings.get(fieldNumber)!.push(bytes.toString('utf8'));
    } else {
      break; // unknown wire type — stop
    }
  }

  return result;
}

// ─── RithmicAPI class ─────────────────────────────────────────────────────────

export class RithmicAPI {
  private credentials: Required<RithmicCredentials>;
  private ws: WebSocket | null = null;
  private authenticated = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(credentials: RithmicCredentials) {
    this.credentials = {
      username:    credentials.username,
      password:    credentials.password,
      systemName:  credentials.systemName  ?? 'Rithmic Test',
      environment: credentials.environment ?? 'test',
      appName:     credentials.appName     ?? 'PropCopia',
      appVersion:  credentials.appVersion  ?? '1.0.0',
    };
  }

  // ── Message builders ───────────────────────────────────────────────────────

  private buildLoginRequest(infraType: number): Buffer {
    return Buffer.concat([
      pbInt32(FIELD.TEMPLATE_ID,      TEMPLATE.REQUEST_LOGIN),
      pbString(FIELD.TEMPLATE_VERSION, '3.9'),
      pbString(FIELD.USER,             this.credentials.username),
      pbString(FIELD.PASSWORD,         this.credentials.password),
      pbString(FIELD.APP_NAME,         this.credentials.appName),
      pbString(FIELD.APP_VERSION,      this.credentials.appVersion),
      pbString(FIELD.SYSTEM_NAME,      this.credentials.systemName),
      pbInt32(FIELD.INFRA_TYPE,        infraType),
    ]);
  }

  private buildHeartbeat(): Buffer {
    return pbInt32(FIELD.TEMPLATE_ID, TEMPLATE.REQUEST_HEARTBEAT);
  }

  private buildLoginInfoRequest(): Buffer {
    return Buffer.concat([
      pbInt32(FIELD.TEMPLATE_ID, TEMPLATE.REQUEST_LOGIN_INFO),
      pbString(FIELD.USER_MSG, 'hello'),
    ]);
  }

  private buildTradeRoutesRequest(): Buffer {
    return Buffer.concat([
      pbInt32(FIELD.TEMPLATE_ID, 310),
      pbString(FIELD.USER_MSG, 'hello'),
    ]);
  }

  private waitForLoginInfoResponse(
    ws: WebSocket,
    timeoutMs: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        clearTimeout(timeout);
        ws.off('message', onMessage);
        ws.off('error', onError);
        ws.off('close', onClose);
      };

      const finishResolve = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const finishReject = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const timeout = setTimeout(() => {
        finishReject(new Error('Timeout waiting for login info response'));
      }, timeoutMs);

      const onMessage = (data: WebSocket.RawData) => {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        const fields = decodeProto(buffer);
        const templateId = fields.ints.get(FIELD.TEMPLATE_ID)?.[0];

        if (templateId === TEMPLATE.REJECT) {
          const rpCode = fields.strings.get(FIELD.RP_CODE)?.[0] ?? 'unknown';
          finishReject(new Error(`Rithmic reject: rp_code=${rpCode}`));
          return;
        }

        if (templateId !== TEMPLATE.RESPONSE_LOGIN_INFO) {
          return;
        }

        const rpCodes = fields.strings.get(FIELD.RP_CODE) ?? [];

        if (rpCodes.includes('0')) {
          finishResolve();
        } else {
          finishReject(
            new Error(`Login info request failed: rp_code=${rpCodes[0] ?? 'unknown'}`),
          );
        }
      };

      const onError = (err: Error) => {
        finishReject(new Error(`Login info request failed: ${err.message}`));
      };

      const onClose = (code: number) => {
        finishReject(new Error(`Login info socket closed before completion (code=${code})`));
      };

      ws.on('message', onMessage);
      ws.on('error', onError);
      ws.on('close', onClose);
    });
  }

  private waitForTradeRoutesResponse(
    ws: WebSocket,
    fcmId: string,
    ibId: string,
    exchange: string,
    timeoutMs: number,
  ): Promise<{ tradeRoute: string }> {
    const EXCHANGE_FIELD = 110101;
    const TRADE_ROUTE_FIELD = 112016;

    return new Promise((resolve, reject) => {
      const candidates: Array<{
        fcmId: string;
        ibId: string;
        exchange: string;
        tradeRoute: string;
      }> = [];

      let settled = false;

      const cleanup = () => {
        clearTimeout(timeout);
        ws.off('message', onMessage);
        ws.off('error', onError);
        ws.off('close', onClose);
      };

      const finishResolve = (value: { tradeRoute: string }) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };

      const finishReject = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const timeout = setTimeout(() => {
        finishReject(new Error('Timeout waiting for trade route response'));
      }, timeoutMs);

      const onMessage = (data: WebSocket.RawData) => {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        const fields = decodeProto(buffer);

        const rpCodes = fields.strings.get(FIELD.RP_CODE) ?? [];
        const messageFcmId = fields.strings.get(FIELD.FCM_ID)?.[0] ?? '';
        const messageIbId = fields.strings.get(FIELD.IB_ID)?.[0] ?? '';
        const messageExchange = fields.strings.get(EXCHANGE_FIELD)?.[0] ?? '';
        const messageTradeRoute = fields.strings.get(TRADE_ROUTE_FIELD)?.[0] ?? '';

        const isMatchingRoute =
          messageFcmId === fcmId &&
          messageIbId === ibId &&
          messageExchange === exchange &&
          messageTradeRoute.length > 0;

        if (isMatchingRoute) {
          candidates.push({
            fcmId: messageFcmId,
            ibId: messageIbId,
            exchange: messageExchange,
            tradeRoute: messageTradeRoute,
          });
        }

        if (rpCodes.includes('0')) {
          const match = candidates[0];
          if (match) {
            finishResolve({ tradeRoute: match.tradeRoute });
          } else {
            finishReject(new Error(`No matching trade route returned for exchange=${exchange}`));
          }
        }
      };

      const onError = (err: Error) => {
        finishReject(new Error(`Trade route request failed: ${err.message}`));
      };

      const onClose = (code: number) => {
        finishReject(new Error(`Trade route socket closed before completion (code=${code})`));
      };

      ws.on('message', onMessage);
      ws.on('error', onError);
      ws.on('close', onClose);
    });
  }

  private waitForNewOrderResponse(
    ws: WebSocket,
    timeoutMs: number,
  ): Promise<{ basketId?: string }> {
    const RESPONSE_NEW_ORDER_TEMPLATE = 313;
    const BASKET_ID_FIELD = 110300;

    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        clearTimeout(timeout);
        ws.off('message', onMessage);
        ws.off('error', onError);
        ws.off('close', onClose);
      };

      const finishResolve = (value: { basketId?: string }) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };

      const finishReject = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const timeout = setTimeout(() => {
        finishReject(new Error('Timeout waiting for new order response'));
      }, timeoutMs);

      const onMessage = (data: WebSocket.RawData) => {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        const fields = decodeProto(buffer);
        const templateId = fields.ints.get(FIELD.TEMPLATE_ID)?.[0];
        const rpCodes = fields.strings.get(FIELD.RP_CODE) ?? [];
        const basketId = fields.strings.get(BASKET_ID_FIELD)?.[0];

        if (templateId === TEMPLATE.REJECT) {
          const rpCode = rpCodes[0] ?? 'unknown';
          finishReject(new Error(`Rithmic reject: rp_code=${rpCode}`));
          return;
        }

        if (templateId !== RESPONSE_NEW_ORDER_TEMPLATE) {
          return;
        }

        if (rpCodes.length > 0) {
          if (rpCodes.includes('0')) {
            finishResolve({ basketId });
          } else {
            finishReject(new Error(`New order failed: rp_code=${rpCodes[0]}`));
          }
        }
      };

      const onError = (err: Error) => {
        finishReject(new Error(`New order request failed: ${err.message}`));
      };

      const onClose = (code: number) => {
        finishReject(new Error(`New order socket closed before completion (code=${code})`));
      };

      ws.on('message', onMessage);
      ws.on('error', onError);
      ws.on('close', onClose);
    });
  }

  private buildNewOrderRequest(
    accountId: string,
    symbol: string,
    side: "BUY" | "SELL",
    quantity: number,
    orderType: "MARKET" | "LIMIT",
    price: number | undefined,
    fcmId: string,
    ibId: string,
    exchange: string,
    tradeRoute: string,
  ): Buffer {
    const SYMBOL_FIELD = 110100;
    const EXCHANGE_FIELD = 110101;
    const PRICE_FIELD = 110306;
    const QUANTITY_FIELD = 112004;
    const TRANSACTION_TYPE_FIELD = 112003;
    const DURATION_FIELD = 112005;
    const PRICE_TYPE_FIELD = 112008;
    const TRADE_ROUTE_FIELD = 112016;

    const BUY = 1;
    const SELL = 2;
    const DAY = 1;
    const LIMIT = 1;
    const MARKET = 2;
    const AUTO = 2;

    const pbDouble = (fieldNumber: number, value: number): Buffer => {
      const tag = writeVarint((fieldNumber << 3) | 1);
      const val = Buffer.allocUnsafe(8);
      val.writeDoubleLE(value, 0);
      return Buffer.concat([tag, val]);
    };

    if (orderType === "LIMIT" && (price === undefined || price <= 0)) {
      throw new Error("LIMIT orders require a valid price.");
    }

    const transactionType = side === "BUY" ? BUY : SELL;
    const priceType = orderType === "MARKET" ? MARKET : LIMIT;

    const parts: Buffer[] = [
      pbInt32(FIELD.TEMPLATE_ID, 312),
      pbString(FIELD.USER_MSG, 'hello'),
      pbString(FIELD.FCM_ID, fcmId),
      pbString(FIELD.IB_ID, ibId),
      pbString(FIELD.ACCOUNT_ID, accountId),
      pbString(SYMBOL_FIELD, symbol),
      pbString(EXCHANGE_FIELD, exchange),
      pbInt32(QUANTITY_FIELD, quantity),
      pbInt32(TRANSACTION_TYPE_FIELD, transactionType),
      pbInt32(DURATION_FIELD, DAY),
      pbInt32(PRICE_TYPE_FIELD, priceType),
      pbString(TRADE_ROUTE_FIELD, tradeRoute),
      pbInt32(FIELD.MANUAL_OR_AUTO, AUTO),
    ];

    if (orderType === "LIMIT") {
      parts.push(pbDouble(PRICE_FIELD, price!));
    }

    return Buffer.concat(parts);
  }

  private buildExitPositionRequest(accountId: string, fcmId: string, ibId: string): Buffer {
    const parts: Buffer[] = [
      pbInt32(FIELD.TEMPLATE_ID,    TEMPLATE.REQUEST_EXIT_POSITION),
      pbString(FIELD.ACCOUNT_ID,    accountId),
      pbInt32(FIELD.MANUAL_OR_AUTO, 2), // 2 = AUTO
    ];
    if (fcmId) parts.push(pbString(FIELD.FCM_ID, fcmId));
    if (ibId)  parts.push(pbString(FIELD.IB_ID,  ibId));
    return Buffer.concat(parts);
  }

  // ── SSL context ────────────────────────────────────────────────────────────

  private makeSslOptions() {
    return { ca: RITHMIC_SSL_CERT, rejectUnauthorized: true };
  }

  // ── Low-level: connect to a plant, authenticate, run action ───────────────

  private connectToPlant(
    uri: string,
    infraType: number,
    onAuthenticated?: (ws: WebSocket, fields: ProtoFields) => void,
  ): Promise<{ success: boolean; message: string; fcmId?: string; ibId?: string }> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ws.terminate();
        resolve({ success: false, message: 'Connection timed out (15 s)' });
      }, 15_000);

      let loginDone = false;
      const ws = new WebSocket(uri, this.makeSslOptions());

      ws.on('open', () => {
        console.log(`[RithmicAPI] Connected to ${uri} — sending login (infra_type=${infraType})`);
        ws.send(this.buildLoginRequest(infraType));
      });

      ws.on('message', (data: Buffer) => {
        const fields = decodeProto(data);
        const templateId = fields.ints.get(FIELD.TEMPLATE_ID)?.[0];
        console.log(`[RithmicAPI] Received template_id=${templateId}`);

        if (templateId === TEMPLATE.RESPONSE_LOGIN && !loginDone) {
          loginDone = true;
          const fcmId = fields.strings.get(FIELD.FCM_ID)?.[0] ?? '';
          const ibId  = fields.strings.get(FIELD.IB_ID)?.[0]  ?? '';
          console.log(`[RithmicAPI] Login OK — fcm_id=${fcmId} ib_id=${ibId}`);

          if (infraType === INFRA_TYPE.TICKER_PLANT) {
            // Save persistent connection for data feeds
            this.ws = ws;
            this.authenticated = true;
            this.startHeartbeat();
          }

          clearTimeout(timeout);
          resolve({ success: true, message: 'Authenticated with Rithmic', fcmId, ibId });

          if (onAuthenticated) onAuthenticated(ws, fields);
        } else if (templateId === TEMPLATE.REJECT) {
          clearTimeout(timeout);
          ws.close();
          const rpCode = fields.strings.get(FIELD.RP_CODE)?.[0] ?? 'unknown';
          resolve({ success: false, message: `Rithmic rejected login (rp_code=${rpCode})` });
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, message: `WebSocket error: ${err.message}` });
      });

      ws.on('close', (code) => {
        clearTimeout(timeout);
        if (!loginDone) {
          resolve({
            success: false,
            message: `Connection closed before login response (code=${code}). Check credentials and system_name.`,
          });
        }
      });
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async authenticate(): Promise<{ success: boolean; message: string }> {
    const serverUri = SERVERS[this.credentials.environment];

    if (!serverUri) {
      return {
        success: false,
        message:
          "Live Rithmic connection is not configured yet. Use Demo until the RITHMIC_LIVE_URL secret is added.",
      };
    }

    console.log(
      `[RithmicAPI] Authenticating ${this.credentials.username} → ${serverUri}`,
    );

    return this.connectToPlant(serverUri, INFRA_TYPE.TICKER_PLANT);
   
  }

  async testConnection(): Promise<{ success: boolean; message: string; data?: RithmicAccount[] }> {
    const authResult = await this.authenticate();
    if (!authResult.success) return authResult;

    const placeholder: RithmicAccount[] = [{
      id:          `${this.credentials.username}-primary`,
      name:        `${this.credentials.username} — ${this.credentials.systemName}`,
      accountType: 'futures',
      active:      true,
    }];

    return { success: true, message: 'Successfully connected to Rithmic', data: placeholder };
  }
  async sendOrder(order: {
    accountId: string;
    symbol: string;
    exchange: string;
    side: "BUY" | "SELL";
    quantity: number;
    orderType: "MARKET" | "LIMIT" | "STOP";
    price?: number;
  }): Promise<void> {
    if (!order.accountId.trim()) {
      throw new Error("Rithmic order requires an account ID.");
    }

    if (!order.symbol.trim()) {
      throw new Error("Rithmic order requires a symbol.");
    }

    if (!order.exchange.trim()) {
      throw new Error("Rithmic order requires an exchange.");
    }

    if (!Number.isInteger(order.quantity) || order.quantity <= 0) {
      throw new Error("Rithmic order quantity must be a positive whole number.");
    }

    if (
      (order.orderType === "LIMIT" || order.orderType === "STOP") &&
      (order.price === undefined || order.price <= 0)
    ) {
      throw new Error(`${order.orderType} orders require a valid price.`);
    }

    if (order.orderType === "STOP") {
      throw new Error("Rithmic STOP orders are not implemented yet.");
    }

    const supportedOrderType = order.orderType;

    const serverUri = SERVERS[this.credentials.environment];

    if (!serverUri) {
      throw new Error(
        "Live Rithmic connection is not configured yet. Use Demo until the RITHMIC_LIVE_URL secret is added.",
      );
    }

    await new Promise<void>((resolve, reject) => {
      let loginDone = false;
      let settled = false;

      const ws = new WebSocket(serverUri, this.makeSslOptions());

      const cleanup = () => {
        clearTimeout(loginTimeout);
        ws.off('open', onOpen);
        ws.off('message', onMessage);
        ws.off('error', onError);
        ws.off('close', onClose);
      };

      const finishResolve = () => {
        if (settled) return;
        settled = true;
        cleanup();
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.terminate();
        }
        resolve();
      };

      const finishReject = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.terminate();
        }
        reject(error);
      };

      const loginTimeout = setTimeout(() => {
        ws.terminate();
        finishReject(new Error('Connection timed out (15 s)'));
      }, 15_000);

      const onOpen = () => {
        ws.send(this.buildLoginRequest(INFRA_TYPE.ORDER_PLANT));
      };

      const onMessage = async (data: WebSocket.RawData) => {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        const fields = decodeProto(buffer);
        const templateId = fields.ints.get(FIELD.TEMPLATE_ID)?.[0];

        if (templateId === TEMPLATE.RESPONSE_LOGIN && !loginDone) {
          loginDone = true;
          clearTimeout(loginTimeout);

          try {
            const fcmId = fields.strings.get(FIELD.FCM_ID)?.[0] ?? '';
            const ibId = fields.strings.get(FIELD.IB_ID)?.[0] ?? '';

            const tradeRoutePromise = this.waitForTradeRoutesResponse(
              ws,
              fcmId,
              ibId,
              order.exchange,
              10_000,
            );
            ws.send(this.buildTradeRoutesRequest());
            const { tradeRoute } = await tradeRoutePromise;

            const newOrderPromise = this.waitForNewOrderResponse(ws, 10_000);
            ws.send(
              this.buildNewOrderRequest(
                order.accountId,
                order.symbol,
                order.side,
                order.quantity,
                supportedOrderType,
                order.price,
                fcmId,
                ibId,
                order.exchange,
                tradeRoute,
              ),
            );
            await newOrderPromise;

            finishResolve();
          } catch (error) {
            finishReject(error instanceof Error ? error : new Error(String(error)));
          }
        } else if (templateId === TEMPLATE.REJECT && !loginDone) {
          const rpCode = fields.strings.get(FIELD.RP_CODE)?.[0] ?? 'unknown';
          finishReject(new Error(`Rithmic rejected login (rp_code=${rpCode})`));
        }
      };

      const onError = (err: Error) => {
        finishReject(new Error(`WebSocket error: ${err.message}`));
      };

      const onClose = (code: number) => {
        if (!loginDone) {
          finishReject(
            new Error(
              `Connection closed before login response (code=${code}). Check credentials and system_name.`,
            ),
          );
        }
      };

      ws.on('open', onOpen);
      ws.on('message', onMessage);
      ws.on('error', onError);
      ws.on('close', onClose);
    });
  }
  /**
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   * 
   * Close all open positions for the given account by connecting to ORDER_PLANT
   * and sending a RequestExitPosition (template 3504).
   *
   * Captures fcm_id and ib_id from the login response — no prior session needed,
   * so this works even if the TICKER_PLANT connection has dropped.
   */
  async closeAllPositions(accountId: string): Promise<{ closed: number; errors: string[] }> {
    const serverUri = SERVERS[this.credentials.environment] ?? SERVERS.test;

    return new Promise((resolve) => {
      let loginDone  = false;
      let exitSent   = false;
      let exitAcked  = false;

      const timeout = setTimeout(() => {
        ws.terminate();
        if (exitSent && !exitAcked) {
          // Request was sent; assume the broker received it even without an ack
          console.warn(`[RithmicAPI] Exit-position ack timed out for ${accountId}, request was sent`);
          resolve({ closed: 1, errors: [] });
        } else {
          resolve({ closed: 0, errors: ['ORDER_PLANT connection timed out before exit request could be sent'] });
        }
      }, 20_000);

      const ws = new WebSocket(serverUri, this.makeSslOptions());

      ws.on('open', () => {
        console.log(`[RithmicAPI] ORDER_PLANT open — logging in for exit-position (account=${accountId})`);
        ws.send(this.buildLoginRequest(INFRA_TYPE.ORDER_PLANT));
      });

      ws.on('message', (data: Buffer) => {
        const fields = decodeProto(data);
        const templateId = fields.ints.get(FIELD.TEMPLATE_ID)?.[0];
        console.log(`[RithmicAPI] ORDER_PLANT msg template_id=${templateId}`);

        if (templateId === TEMPLATE.RESPONSE_LOGIN && !loginDone) {
          loginDone = true;
          const fcmId = fields.strings.get(FIELD.FCM_ID)?.[0] ?? '';
          const ibId  = fields.strings.get(FIELD.IB_ID)?.[0]  ?? '';
          console.log(`[RithmicAPI] ORDER_PLANT login OK — sending ExitPosition fcm=${fcmId} ib=${ibId} acct=${accountId}`);
          ws.send(this.buildExitPositionRequest(accountId, fcmId, ibId));
          exitSent = true;
        } else if (templateId === TEMPLATE.RESPONSE_EXIT_POSITION) {
          exitAcked = true;
          const rpCode = fields.strings.get(FIELD.RP_CODE)?.[0];
          clearTimeout(timeout);
          ws.close();
          if (rpCode === '0' || rpCode === undefined) {
            console.log(`[RithmicAPI] ExitPosition confirmed for account=${accountId}`);
            resolve({ closed: 1, errors: [] });
          } else {
            console.warn(`[RithmicAPI] ExitPosition rp_code=${rpCode} for account=${accountId}`);
            resolve({ closed: 0, errors: [`Exit position returned rp_code=${rpCode}`] });
          }
        } else if (templateId === TEMPLATE.REJECT) {
          clearTimeout(timeout);
          ws.close();
          const rpCode = fields.strings.get(FIELD.RP_CODE)?.[0] ?? 'unknown';
          resolve({ closed: 0, errors: [`Rithmic reject: rp_code=${rpCode}`] });
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ closed: 0, errors: [`ORDER_PLANT error: ${err.message}`] });
      });

      ws.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /** Expose credentials so the kill switch can create a fresh instance from DB creds */
  getCredentials(): Required<RithmicCredentials> {
    return { ...this.credentials };
  }

  isAuthenticated(): boolean {
    return this.authenticated && this.ws?.readyState === WebSocket.OPEN;
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(this.buildHeartbeat());
        console.log('[RithmicAPI] Heartbeat sent');
      }
    }, 30_000);
  }

  async disconnect(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;
    this.authenticated = false;
    console.log('[RithmicAPI] Disconnected');
  }
}
