import { z } from 'zod';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const positiveIntegerLimit = z.number().int().positive().max(1_000_000);
const positiveMoneyLimit = z.number().finite().positive().max(1_000_000_000);
const percentageLimit = z.number().finite().positive().max(100);

const tickerList = z
  .array(z.string().trim().min(1).max(20))
  .max(100)
  .transform((values) =>
    Array.from(new Set(values.map((value) => value.toUpperCase()))).sort(),
  );

export const accountRiskSettingsPatchSchema = z
  .object({
    riskMode: z.enum(['global', 'custom']).optional(),
    positionScaling: z.number().int().min(10).max(200).optional(),
    maxContracts: positiveIntegerLimit.nullable().optional(),
    maxOpenPositions: positiveIntegerLimit.nullable().optional(),
    allowedDirections: z.enum(['both', 'long_only', 'short_only']).optional(),
    maxDailyLoss: positiveMoneyLimit.nullable().optional(),
    maxDailyLossPct: percentageLimit.nullable().optional(),
    maxWeeklyLoss: positiveMoneyLimit.nullable().optional(),
    maxWeeklyLossPct: percentageLimit.nullable().optional(),
    maxDrawdownPct: percentageLimit.nullable().optional(),
    maxConsecutiveLosses: positiveIntegerLimit.nullable().optional(),
    blockedTickers: tickerList.optional(),
    allowedTickers: tickerList.optional(),
    maxTradesPerDay: positiveIntegerLimit.nullable().optional(),
    minAccountBalance: z.number().finite().nonnegative().max(1_000_000_000).nullable().optional(),
    tradingStartTime: z.string().regex(TIME_PATTERN).nullable().optional(),
    tradingEndTime: z.string().regex(TIME_PATTERN).nullable().optional(),
    tradingDays: z.array(z.enum(DAY_KEYS)).min(1).max(DAY_KEYS.length).optional().transform((values) =>
      values ? Array.from(new Set(values)) : values,
    ),
    cooldownAfterLoss: z.number().int().min(1).max(1_440).nullable().optional(),
    onBreachAction: z.enum(['pause', 'alert', 'close_and_pause']).optional(),
  })
  .strict()
  .superRefine((settings, context) => {
    if (Object.keys(settings).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one risk setting is required.',
      });
    }

    if (
      settings.tradingStartTime &&
      settings.tradingEndTime &&
      settings.tradingStartTime === settings.tradingEndTime
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tradingEndTime'],
        message: 'Trading start and end times must be different.',
      });
    }
  });

export type AccountRiskSettingsPatch = z.infer<typeof accountRiskSettingsPatchSchema>;

export function parseAccountRiskSettingsPatch(input: unknown):
  | { success: true; data: AccountRiskSettingsPatch }
  | { success: false; message: string; errors: Record<string, string[]> } {
  const result = accountRiskSettingsPatchSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const flattened = result.error.flatten();
  return {
    success: false,
    message: 'One or more risk settings are invalid.',
    errors: {
      ...flattened.fieldErrors,
      ...(flattened.formErrors.length > 0 ? { form: flattened.formErrors } : {}),
    },
  };
}
