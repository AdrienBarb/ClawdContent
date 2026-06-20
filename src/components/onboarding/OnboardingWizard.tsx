"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus";
import { captureClientEvent } from "@/lib/tracking/clientEvents";
import Step1Website from "./Step1Website";
import Step2Connect from "./Step2Connect";
import Step3Goal from "./Step3Goal";
import Step4BusinessInfo from "./Step4BusinessInfo";
import Step5Branding from "./Step5Branding";
import Step6Paywall from "./Step6Paywall";
import { ONBOARDING_STEPS, TOTAL_STEPS } from "./OnboardingShell";

/** Structural step label for analytics (which step, never user input). */
const stepName = (n: number): string =>
  ONBOARDING_STEPS[n - 1]?.label ?? `step_${n}`;

export default function OnboardingWizard({
  initialStep,
}: {
  initialStep: number;
}) {
  const router = useRouter();
  const [rawStep, setStep] = useQueryState(
    "step",
    parseAsInteger.withDefault(initialStep)
  );
  const [stripeSuccess] = useQueryState("stripe_success", parseAsString);
  const { data: status, refetch } = useOnboardingStatus();

  const step = Math.min(Math.max(rawStep || 1, 1), TOTAL_STEPS);

  // Subscription started → onboarding complete → into the app. Guard so the
  // redirect fires once and the step UI doesn't flash behind it.
  const redirected = useRef(false);
  useEffect(() => {
    if (status?.isCompleted && !redirected.current) {
      redirected.current = true;
      router.replace(appRouter.dashboard);
    }
  }, [status?.isCompleted, router]);

  // Resume: the server's onboardingStep is the source of truth. If polling
  // reports a step ahead of the URL (resumed on another device, or a stale
  // ?step), advance to it once — never regress.
  const reconciled = useRef(false);
  useEffect(() => {
    if (reconciled.current || status === undefined) return;
    reconciled.current = true;
    if (!stripeSuccess && status.step > step) void setStep(status.step);
  }, [status, step, stripeSuccess, setStep]);

  // Back from Stripe: poll until the webhook flips onboardingCompletedAt.
  useEffect(() => {
    if (!stripeSuccess || status?.isCompleted) return;
    const id = setInterval(() => void refetch(), 2000);
    return () => clearInterval(id);
  }, [stripeSuccess, status?.isCompleted, refetch]);

  // Analytics funnel — driven from the single `step` source. `started` fires
  // once per mount; `step_viewed` on every step entry; `step_completed` on a
  // forward single-step advance (prev → prev+1) for in-wizard moves (Back and
  // resume/reconcile multi-step jumps never emit it). The OAuth connect path
  // leaves the wizard full-page and remounts at step 3, so the Connect step's
  // completion is emitted from OnboardingConnectedBridge, not here.
  const startedFired = useRef(false);
  const trackedStep = useRef<number | null>(null);
  useEffect(() => {
    if (!startedFired.current) {
      startedFired.current = true;
      captureClientEvent("onboarding_started");
    }
    const prev = trackedStep.current;
    if (prev === step) return;
    if (prev !== null && step === prev + 1) {
      captureClientEvent("onboarding_step_completed", {
        step: prev,
        step_name: stepName(prev),
      });
    }
    captureClientEvent("onboarding_step_viewed", {
      step,
      step_name: stepName(step),
    });
    trackedStep.current = step;
  }, [step]);

  const goTo = (n: number) => {
    void setStep(n);
    void refetch();
  };

  if (status?.isCompleted || (stripeSuccess && !status?.isCompleted)) {
    return (
      <div className="flex flex-col items-center justify-center px-4 text-center">
        <SpinnerGapIcon className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-gray-600">Setting up your account…</p>
      </div>
    );
  }

  // Each step renders its own OnboardingShell — the layout centers the card.
  return (
    <>
      {step === 1 && <Step1Website status={status} onNext={() => goTo(2)} />}
      {step === 2 && (
        <Step2Connect
          status={status}
          onRefetch={() => void refetch()}
          onBack={() => goTo(1)}
          onNext={() => goTo(3)}
        />
      )}
      {step === 3 && (
        <Step3Goal
          status={status}
          onBack={() => goTo(2)}
          onNext={() => goTo(4)}
        />
      )}
      {step === 4 && (
        <Step4BusinessInfo
          status={status}
          onRefetch={() => void refetch()}
          onBack={() => goTo(3)}
          onNext={() => goTo(5)}
        />
      )}
      {step === 5 && (
        <Step5Branding
          status={status}
          onBack={() => goTo(4)}
          onNext={() => goTo(6)}
        />
      )}
      {step === 6 && <Step6Paywall />}
    </>
  );
}
