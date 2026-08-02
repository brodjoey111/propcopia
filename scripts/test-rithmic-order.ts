import { RithmicAPI } from "../server/rithmic-api.ts";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const username = requireEnv("RITHMIC_USERNAME");
  const password = requireEnv("RITHMIC_PASSWORD");
  const systemName = requireEnv("RITHMIC_SYSTEM_NAME");
  const accountId = requireEnv("RITHMIC_ACCOUNT_ID");
  const symbol = requireEnv("RITHMIC_SYMBOL");
  const exchange = requireEnv("RITHMIC_EXCHANGE");

  const api = new RithmicAPI({
    username,
    password,
    systemName,
    environment: "test",
  });

  try {
    await api.sendOrder({
      accountId,
      symbol,
      exchange,
      side: "BUY",
      quantity: 1,
      orderType: "MARKET",
    });

    console.log(
      `SUCCESS: Submitted 1-lot Rithmic test MARKET BUY order for ${symbol} on ${exchange} in account ${accountId}.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAILURE: Rithmic test order was not submitted. ${message}`);
    process.exitCode = 1;
  } finally {
    await api.disconnect();
  }
}

await main();
