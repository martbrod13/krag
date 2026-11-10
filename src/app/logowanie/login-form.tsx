"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type LoginFormProps = {
  next: string;
  /** In development the code is printed in the VS Code terminal. */
  showDevHint: boolean;
};

type AuthError = { code?: string; status: number } | null;

const ERROR_KEYS = {
  INVALID_OTP: "invalidCode",
  OTP_EXPIRED: "expiredCode",
  TOO_MANY_ATTEMPTS: "tooManyAttempts",
  INVALID_EMAIL: "invalidEmail",
} as const;

export function LoginForm({ next, showDevHint }: LoginFormProps) {
  const t = useTranslations("Login");
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function showError(authError: NonNullable<AuthError>) {
    if (authError.status === 429) {
      setError(t("errors.rateLimited"));
      return;
    }
    const key =
      authError.code && authError.code in ERROR_KEYS
        ? ERROR_KEYS[authError.code as keyof typeof ERROR_KEYS]
        : "generic";
    setError(t(`errors.${key}`));
  }

  async function sendCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setPending(true);
    setError(null);
    const { error: authError } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: "sign-in",
    });
    setPending(false);
    if (authError) {
      showError(authError);
      return;
    }
    setCode("");
    setStep("code");
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: authError } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp: code.trim(),
    });
    if (authError) {
      setPending(false);
      showError(authError);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-bold">{t("emailLabel")}</span>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <Button type="submit" size="lg" disabled={pending}>
            {t("sendCode")}
          </Button>
        </form>
      ) : (
        <form onSubmit={signIn} className="flex flex-col gap-4">
          <p className="text-lg">{t("codeSent", { email: email.trim() })}</p>
          <label className="flex flex-col gap-2">
            <span className="font-bold">{t("codeLabel")}</span>
            <Input
              name="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
              className="text-center text-3xl tracking-[0.4em]"
            />
          </label>
          <Button type="submit" size="lg" disabled={pending}>
            {t("signIn")}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => void sendCode()}
            >
              {t("resend")}
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setStep("email");
                setError(null);
              }}
            >
              {t("changeEmail")}
            </Button>
          </div>
          {showDevHint ? (
            <p className="rounded-2xl bg-info-soft p-4 text-info">
              {t("devHint")}
            </p>
          ) : null}
        </form>
      )}

      {error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
