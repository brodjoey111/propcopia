type ProfileDisplayInput = {
  username?: string | null;
  title?: string | null;
  bio?: string | null;
};

export function getProfileInitial(username?: string | null): string {
  return username?.trim().charAt(0).toUpperCase() || "U";
}

export function getProfileSubtitle(profile?: ProfileDisplayInput | null): string {
  return profile?.title?.trim() || profile?.bio?.trim() || "Trader";
}
