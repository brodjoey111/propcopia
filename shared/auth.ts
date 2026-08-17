import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 72;
const EXISTING_PASSWORD_MAX_LENGTH = 1024;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username must be 50 characters or fewer")
  .regex(/^[A-Za-z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and hyphens");

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_LENGTH, {
    message: `Password must be ${PASSWORD_MAX_LENGTH} UTF-8 bytes or fewer`,
  });

export const signupCredentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const loginCredentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1).max(EXISTING_PASSWORD_MAX_LENGTH),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(EXISTING_PASSWORD_MAX_LENGTH),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
