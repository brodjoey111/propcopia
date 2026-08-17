import { z } from "zod";

export const MAX_PROFILE_PICTURE_DATA_URL_LENGTH = 90_000;

const profilePictureSchema = z.string()
  .max(MAX_PROFILE_PICTURE_DATA_URL_LENGTH, "Profile picture is too large.")
  .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Profile picture must be a supported image data URL.");

const userProfileUpdateSchema = z.object({
  bio: z.string().trim().max(200, "Bio must be 200 characters or fewer.").nullable().optional(),
  title: z.string().trim().max(80, "Title must be 80 characters or fewer.").nullable().optional(),
  profilePicture: profilePictureSchema.nullable().optional(),
}).strict();

export function parseUserProfileUpdate(input: unknown):
  | { success: true; data: z.infer<typeof userProfileUpdateSchema> }
  | { success: false; message: string } {
  const parsed = userProfileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid profile update.",
    };
  }
  return { success: true, data: parsed.data };
}

export function serializeProfilePicture(value: string | null | undefined): string | null {
  if (!value || value.length > MAX_PROFILE_PICTURE_DATA_URL_LENGTH) return null;
  return profilePictureSchema.safeParse(value).success ? value : null;
}
