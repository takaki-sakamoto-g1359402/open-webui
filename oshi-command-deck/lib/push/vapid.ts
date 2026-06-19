export type VapidConfig =
  | {
      configured: true;
      publicKey: string;
      privateKey: string;
      subject: string;
    }
  | {
      configured: false;
      reason: "missing_public_key" | "missing_private_key" | "missing_subject";
    };

export function getVapidConfig(env: NodeJS.ProcessEnv = process.env): VapidConfig {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return { configured: false, reason: "missing_public_key" };
  }

  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!privateKey) {
    return { configured: false, reason: "missing_private_key" };
  }

  const subject = env.VAPID_SUBJECT?.trim();
  if (!subject) {
    return { configured: false, reason: "missing_subject" };
  }

  return {
    configured: true,
    publicKey,
    privateKey,
    subject
  };
}
