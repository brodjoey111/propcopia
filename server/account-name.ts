import { z } from "zod";

const accountNameSchema = z.object({
  name: z.string().trim().min(1, "Account name is required.").max(80, "Account name must be 80 characters or fewer."),
}).strict();

export function parseAccountName(input: unknown):
  | { success: true; name: string }
  | { success: false; message: string } {
  const parsed = accountNameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid account name.",
    };
  }

  return { success: true, name: parsed.data.name };
}
