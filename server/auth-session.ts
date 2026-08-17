import type { Request } from "express";

export async function establishAuthenticatedSession(
  req: Request,
  user: { id: string; username: string },
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  req.session.userId = user.id;
  req.session.username = user.username;

  await new Promise<void>((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        delete req.session.userId;
        delete req.session.username;
        reject(error);
        return;
      }
      resolve();
    });
  });
}
