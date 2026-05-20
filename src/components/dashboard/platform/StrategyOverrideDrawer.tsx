"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import {
  MinusIcon,
  PlusIcon,
  SpinnerGapIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { appRouter } from "@/lib/constants/appRouter";
import type { PlatformAccount } from "@/components/dashboard/platform/types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: PlatformAccount;
  cadenceDefault: number;
  onMutated: () => void;
}

interface DraftSlot {
  day: number;
  hour: number;
  score?: number;
}

export default function StrategyOverrideDrawer({
  open,
  onOpenChange,
  account,
  cadenceDefault,
  onMutated,
}: Props) {
  const cadenceMin = Math.max(1, cadenceDefault - 2);
  const cadenceMax = Math.min(25, cadenceDefault + 2);

  const [postsPerWeek, setPostsPerWeek] = useState(
    account.strategy?.postsPerWeek ?? cadenceDefault
  );
  const [pillars, setPillars] = useState<string[]>(
    account.strategy?.contentPillars ?? []
  );
  const [pillarDraft, setPillarDraft] = useState("");
  const [voiceRules, setVoiceRules] = useState<string[]>(
    account.strategy?.voiceRules ?? []
  );
  const [voiceDraft, setVoiceDraft] = useState("");
  const [bestTimes, setBestTimes] = useState<DraftSlot[]>(
    account.strategy?.bestTimes ?? []
  );
  const [imageStyle, setImageStyle] = useState(
    account.strategy?.imageStyle ?? ""
  );
  const [saving, setSaving] = useState(false);

  // Re-seed local state when a different account loads.
  useEffect(() => {
    if (open) {
      setPostsPerWeek(account.strategy?.postsPerWeek ?? cadenceDefault);
      setPillars(account.strategy?.contentPillars ?? []);
      setVoiceRules(account.strategy?.voiceRules ?? []);
      setBestTimes(account.strategy?.bestTimes ?? []);
      setImageStyle(account.strategy?.imageStyle ?? "");
      setPillarDraft("");
      setVoiceDraft("");
    }
  }, [open, account, cadenceDefault]);

  function addPillar() {
    const v = pillarDraft.trim();
    if (!v || pillars.includes(v) || pillars.length >= 5) return;
    setPillars([...pillars, v]);
    setPillarDraft("");
  }

  function removePillar(p: string) {
    setPillars(pillars.filter((x) => x !== p));
  }

  function addVoiceRule() {
    const v = voiceDraft.trim();
    if (!v || voiceRules.includes(v) || voiceRules.length >= 4) return;
    setVoiceRules([...voiceRules, v]);
    setVoiceDraft("");
  }

  function removeVoiceRule(r: string) {
    setVoiceRules(voiceRules.filter((x) => x !== r));
  }

  function addSlot() {
    if (bestTimes.length >= 14) return;
    setBestTimes([...bestTimes, { day: 0, hour: 9, score: 0 }]);
  }

  function updateSlot(i: number, patch: Partial<DraftSlot>) {
    setBestTimes(bestTimes.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeSlot(i: number) {
    setBestTimes(bestTimes.filter((_, idx) => idx !== i));
  }

  const pillarsValid = pillars.length >= 3 && pillars.length <= 5;
  const voiceValid = voiceRules.length >= 2 && voiceRules.length <= 4;
  const timesValid = bestTimes.length >= 1;
  const canSave = pillarsValid && voiceValid && timesValid && !saving;

  async function save() {
    setSaving(true);
    try {
      await axios.patch(appRouter.api.account(account.id), {
        strategy: {
          postsPerWeek,
          contentPillars: pillars,
          voiceRules,
          bestTimes,
          imageStyle: imageStyle || "Neutral, on-brand visuals.",
        },
      });
      toast.success("Strategy updated.");
      onOpenChange(false);
      onMutated();
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Couldn't save the strategy.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="border-b border-gray-100 pb-3">
          <SheetTitle className="text-[15px] font-semibold tracking-tight">
            Customize strategy
          </SheetTitle>
          <SheetDescription className="sr-only">
            Override cadence, content pillars, voice rules, best times, and
            image style for this account.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Cadence ----------------------------------------------- */}
          <section>
            <header className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Posts per week
              </p>
              <p className="text-[11px] text-gray-400 tabular-nums">
                default {cadenceDefault}
              </p>
            </header>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setPostsPerWeek(Math.max(cadenceMin, postsPerWeek - 1))
                }
                disabled={postsPerWeek <= cadenceMin}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <MinusIcon size={14} weight="bold" />
              </button>
              <p className="flex-1 text-center text-2xl font-semibold tabular-nums text-gray-900">
                {postsPerWeek}
              </p>
              <button
                type="button"
                onClick={() =>
                  setPostsPerWeek(Math.min(cadenceMax, postsPerWeek + 1))
                }
                disabled={postsPerWeek >= cadenceMax}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <PlusIcon size={14} weight="bold" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Range: {cadenceMin}-{cadenceMax} per week.
            </p>
          </section>

          {/* Pillars ----------------------------------------------- */}
          <section>
            <header className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Content pillars
              </p>
              <p
                className={`text-[11px] tabular-nums ${
                  pillarsValid ? "text-gray-400" : "text-amber-700"
                }`}
              >
                {pillars.length}/3-5
              </p>
            </header>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pillars.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] text-gray-700"
                >
                  {p}
                  <button
                    type="button"
                    onClick={() => removePillar(p)}
                    className="text-gray-400 hover:text-gray-700"
                    aria-label={`Remove ${p}`}
                  >
                    <XIcon size={11} weight="bold" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={pillarDraft}
                onChange={(e) => setPillarDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPillar();
                  }
                }}
                disabled={pillars.length >= 5}
                placeholder="Add a pillar"
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] focus:border-gray-400 focus:outline-none disabled:bg-gray-50"
              />
              <button
                type="button"
                onClick={addPillar}
                disabled={!pillarDraft.trim() || pillars.length >= 5}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <PlusIcon size={12} weight="bold" />
                Add
              </button>
            </div>
          </section>

          {/* Voice rules ------------------------------------------- */}
          <section>
            <header className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Voice rules
              </p>
              <p
                className={`text-[11px] tabular-nums ${
                  voiceValid ? "text-gray-400" : "text-amber-700"
                }`}
              >
                {voiceRules.length}/2-4
              </p>
            </header>
            <ul className="mt-2 space-y-1.5">
              {voiceRules.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2"
                >
                  <span className="flex-1 text-[12.5px] leading-relaxed text-gray-700">
                    {r}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVoiceRule(r)}
                    className="text-gray-400 hover:text-gray-700"
                    aria-label={`Remove voice rule: ${r.slice(0, 60)}`}
                  >
                    <XIcon size={12} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={voiceDraft}
                onChange={(e) => setVoiceDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addVoiceRule();
                  }
                }}
                disabled={voiceRules.length >= 4}
                placeholder="Add a voice rule"
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] focus:border-gray-400 focus:outline-none disabled:bg-gray-50"
              />
              <button
                type="button"
                onClick={addVoiceRule}
                disabled={!voiceDraft.trim() || voiceRules.length >= 4}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <PlusIcon size={12} weight="bold" />
                Add
              </button>
            </div>
          </section>

          {/* Best times -------------------------------------------- */}
          <section>
            <header className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Best times
              </p>
              <button
                type="button"
                onClick={addSlot}
                disabled={bestTimes.length >= 14}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40"
              >
                <PlusIcon size={11} weight="bold" />
                Add slot
              </button>
            </header>
            <ul className="mt-2 space-y-1.5">
              {bestTimes.map((slot, i) => (
                <li
                  key={`slot-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2 py-1.5"
                >
                  <select
                    value={slot.day}
                    onChange={(e) =>
                      updateSlot(i, { day: Number(e.target.value) })
                    }
                    className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[12.5px] focus:border-gray-400 focus:outline-none"
                  >
                    {DAY_NAMES.map((name, d) => (
                      <option key={d} value={d}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={slot.hour}
                    onChange={(e) =>
                      updateSlot(i, { hour: Number(e.target.value) })
                    }
                    className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[12.5px] tabular-nums focus:border-gray-400 focus:outline-none"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h.toString().padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => removeSlot(i)}
                    className="text-gray-400 hover:text-gray-700"
                    aria-label="Remove time slot"
                  >
                    <XIcon size={12} weight="bold" />
                  </button>
                </li>
              ))}
              {bestTimes.length === 0 && (
                <li className="rounded-lg border border-dashed border-gray-200 p-2 text-center text-[11.5px] text-gray-400">
                  Add at least one slot.
                </li>
              )}
            </ul>
          </section>

          {/* Image style ------------------------------------------- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Image style
            </p>
            <textarea
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value)}
              rows={3}
              placeholder="One sentence on the visual look — colors, mood, composition."
              className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12.5px] leading-relaxed focus:border-gray-400 focus:outline-none"
            />
          </section>

          {/* Save -------------------------------------------------- */}
          <div className="sticky bottom-0 -mx-6 border-t border-gray-100 bg-white px-6 py-3">
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(180deg,_#ec6f5b_0%,_#c84a35_100%)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),_0_1px_2px_rgba(200,74,53,0.25)] disabled:opacity-50"
            >
              {saving && <SpinnerGapIcon size={14} className="animate-spin" />}
              Save strategy
            </button>
            {!canSave && !saving && (
              <p className="mt-2 text-center text-[11px] text-amber-700">
                {!pillarsValid
                  ? "Need 3-5 pillars."
                  : !voiceValid
                  ? "Need 2-4 voice rules."
                  : !timesValid
                  ? "Need at least one time slot."
                  : ""}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
