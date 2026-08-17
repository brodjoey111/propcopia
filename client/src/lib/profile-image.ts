export const PROFILE_IMAGE_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_MAX_OUTPUT_BYTES = 60 * 1024;
export const PROFILE_IMAGE_DIMENSION = 256;

interface ProfileImageFileLike {
  size: number;
  type: string;
}

export function validateProfileImageFile(file: ProfileImageFileLike): string | null {
  if (!file.type.startsWith("image/")) return "Choose an image file.";
  if (file.size > PROFILE_IMAGE_MAX_SOURCE_BYTES) return "Choose an image smaller than 5 MB.";
  return null;
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",", 2)[1] ?? "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor(base64.length * 3 / 4) - padding);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("The selected image format could not be opened."));
    image.onload = () => resolve(image);
    image.src = source;
  });
}

export async function prepareProfileImage(file: File): Promise<string> {
  const validationMessage = validateProfileImageFile(file);
  if (validationMessage) throw new Error(validationMessage);

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_IMAGE_DIMENSION;
  canvas.height = PROFILE_IMAGE_DIMENSION;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable in this browser.");

  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - cropSize) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - cropSize) / 2);
  context.fillStyle = "#111827";
  context.fillRect(0, 0, PROFILE_IMAGE_DIMENSION, PROFILE_IMAGE_DIMENSION);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    PROFILE_IMAGE_DIMENSION,
    PROFILE_IMAGE_DIMENSION,
  );

  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const output = canvas.toDataURL("image/jpeg", quality);
    if (estimateDataUrlBytes(output) <= PROFILE_IMAGE_MAX_OUTPUT_BYTES) return output;
  }

  throw new Error("The image could not be compressed enough. Choose a simpler photo.");
}
