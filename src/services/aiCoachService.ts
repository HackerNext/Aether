import {
  CardioLoadEwma,
  ConnectedDevice,
  DailyBiometricRecord,
  FitnessAgeMetrics,
  HabitCorrelationResult,
  MorningBriefing,
  RecoveryBreakdown,
  SleepDebtPlan,
  StrainBreakdown,
  UserProfile,
} from '../types/health';
import { formatMinutesToHm } from '../utils/biometricsEngine';

export interface BiometricContextBundle {
  profile: UserProfile;
  device: ConnectedDevice;
  today: DailyBiometricRecord | null;
  recovery: RecoveryBreakdown;
  strain: StrainBreakdown;
  sleepPlan: SleepDebtPlan;
  ewma: CardioLoadEwma;
  fitnessAge: FitnessAgeMetrics;
  correlations: HabitCorrelationResult[];
}

export function generateOfflineMorningBriefing(ctx: BiometricContextBundle): MorningBriefing {
  const { recovery, strain, sleepPlan, ewma, today } = ctx;

  if (!today || recovery.score === null) {
    return {
      headline: 'Clean Slate — Connect or Check In',
      summary:
        'AETHER keeps zero fake data on launch. Sync Android Health Connect from your watch or complete a 15-second Morning Wellness check-in to generate personalized daily guidance.',
      actionItems: [
        'Open System → Watch & Health Connect to authorize and pull your real watch data.',
        'Tap Log → Wellness for a 15-second Hooper check-in (Sleep Quality, Fatigue, Stress, Soreness).',
        'Open System → Science Guide anytime to read how every score works in plain English.',
      ],
      generatedBy: 'aether_heuristic',
      generatedAtIso: new Date().toISOString(),
    };
  }

  let headline = 'Balanced Readiness — Train Smart';
  if (recovery.perceptionOverrideActive) headline = 'Perception Override — Dial Back Today';
  else if (recovery.state === 'optimal') headline = 'Strong Rebound — Ready for Quality Work';
  else if (recovery.state === 'low') headline = 'Recovery Low — Prioritize Restoration';

  const rhrTxt =
    today.restingHrBpm !== null
      ? `RHR ${today.restingHrBpm} bpm (${recovery.rhrZScore !== null ? `${recovery.rhrZScore >= 0 ? '+' : ''}${recovery.rhrZScore}σ` : 'baseline'})`
      : 'RHR not synced';

  const summary = `Recovery sits at ${recovery.score}% (${recovery.swcLabel}) with ${rhrTxt}. Uncoupled EWMA workload is ${ewma.ratio ?? '--'} (${ewma.statusLabel})${ewma.monotonyAlert ? ' and weekly monotony is elevated' : ''}.`;

  const action1 = recovery.perceptionOverrideActive
    ? 'Your morning feel flagged high fatigue or soreness despite calm heart-rate numbers. Keep today light (Zone 1–2 movement or mobility).'
    : recovery.state === 'optimal'
      ? `Target ${strain.targetRange[0]}–${strain.targetRange[1]} Strain today with focused conditioning or progressive strength sets.`
      : recovery.state === 'moderate'
        ? `Aim for ${strain.targetRange[0]}–${strain.targetRange[1]} Strain—steady aerobic volume or crisp technique work.`
        : `Keep Strain under ${strain.targetRange[1]} and protect recovery with easy movement and early rest.`;

  const action2 = sleepPlan.hasSleepData
    ? `Lights-out around ${sleepPlan.recommendedBedtime} supports your ${formatMinutesToHm(sleepPlan.personalBaselineNeedMin)} personal sleep need (7d regularity: ${sleepPlan.regularityScorePct ?? '--'}%).`
    : 'Sync overnight sleep from Health Connect (or log manually) to track 7-day Sleep Regularity.';

  const action3 = ewma.monotonyAlert
    ? `Weekly training monotony reached ${ewma.weeklyMonotony} (>2.0). Vary your intensity—schedule a true easy day soon.`
    : !today.wellness
      ? 'Complete today’s 15-second Morning Wellness check-in so AETHER can cross-check how your body actually feels.'
      : `Hydration is ${today.hydration.waterMl}/${ctx.profile.dailyWaterGoalMl} ml. Log meals & habits to unlock 95% CI habit insights.`;

  return {
    headline,
    summary,
    actionItems: [action1, action2, action3],
    generatedBy: 'aether_heuristic',
    generatedAtIso: new Date().toISOString(),
  };
}

function buildSystemPrompt(ctx: BiometricContextBundle): string {
  return `You are AETHER Coach, an evidence-based sports scientist. Be concise, honest about optical sensor limits, and reference only real synced numbers:
- Recovery: ${ctx.recovery.score ?? 'No data'}% (${ctx.recovery.badgeLabel}, SWC: ${ctx.recovery.swcLabel}, Perception Override: ${ctx.recovery.perceptionOverrideActive})
- RHR: ${ctx.today?.restingHrBpm ?? '--'} bpm (30d mean ${ctx.recovery.rhrMean30d ?? '--'} ± ${ctx.recovery.rhrSd30d ?? '--'}, Z=${ctx.recovery.rhrZScore ?? '--'})
- Hooper Wellness: ${ctx.today?.wellness ? `${ctx.today.wellness.wellnessScore}/100 (Soreness ${ctx.today.wellness.soreness}/7, Stress ${ctx.today.wellness.stress}/7, Freshness ${ctx.today.wellness.freshness}/7)` : 'Not logged'}
- Dual Strain: Total ${ctx.strain.score}/21 (Cardio ${ctx.strain.cardioScore}, Muscular ${ctx.strain.muscularScore})
- Uncoupled EWMA: ${ctx.ewma.ratio ?? '--'} (${ctx.ewma.statusLabel}) | Weekly Monotony: ${ctx.ewma.weeklyMonotony ?? '--'}
- Sleep: ${ctx.today?.sleep ? formatMinutesToHm(ctx.today.sleep.totalSleepMin) : '--'} vs Personal Need ${formatMinutesToHm(ctx.sleepPlan.personalBaselineNeedMin)} | 7d Regularity: ${ctx.sleepPlan.regularityScorePct ?? '--'}%
- Cardio & Sleep Fitness Age: ${ctx.fitnessAge.fitnessAge ?? '--'} yrs (VO2: ${ctx.fitnessAge.vo2MaxUsed ?? '--'} via ${ctx.fitnessAge.vo2Source})`;
}

export async function generateGeminiBriefing(ctx: BiometricContextBundle): Promise<MorningBriefing> {
  const apiKey = ctx.profile.geminiApiKey.trim();
  if (!apiKey || !ctx.today || ctx.recovery.score === null) {
    return generateOfflineMorningBriefing(ctx);
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${buildSystemPrompt(ctx)}\n\nReturn strict JSON ONLY: {"headline": string, "summary": string, "actionItems": [string, string, string]}.`,
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
        }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text);
    if (parsed?.headline && parsed?.summary && Array.isArray(parsed?.actionItems)) {
      return {
        headline: String(parsed.headline),
        summary: String(parsed.summary),
        actionItems: parsed.actionItems.slice(0, 3).map(String),
        generatedBy: 'gemini',
        generatedAtIso: new Date().toISOString(),
      };
    }
  } catch {
    // fallback
  }
  return generateOfflineMorningBriefing(ctx);
}

export async function askAetherCoach(question: string, ctx: BiometricContextBundle): Promise<string> {
  const apiKey = ctx.profile.geminiApiKey.trim();
  if (apiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${buildSystemPrompt(ctx)}\n\nUser Question: ${question}` }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 320 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch {
      // fallback
    }
  }

  if (!ctx.today || ctx.recovery.score === null) {
    return 'No biometric data is synced yet. Go to System → Watch & Health Connect to sync your watch, or open Log → Wellness to complete your first 15-second morning check-in.';
  }

  const q = question.toLowerCase();
  if (q.includes('train') || q.includes('strain') || q.includes('ewma')) {
    return `Recovery is ${ctx.recovery.score}% (${ctx.recovery.swcLabel}). Today's Strain is ${ctx.strain.score}/21 (Cardio ${ctx.strain.cardioScore} • Muscular ${ctx.strain.muscularScore}). Your Uncoupled EWMA workload ratio is ${ctx.ewma.ratio ?? '--'} (${ctx.ewma.statusLabel})${ctx.ewma.monotonyAlert ? ` — note that weekly monotony is ${ctx.ewma.weeklyMonotony}, so mix in a real rest day.` : '.'}`;
  }
  if (q.includes('sleep') || q.includes('bed')) {
    return `Your personal sleep baseline is ${formatMinutesToHm(ctx.sleepPlan.personalBaselineNeedMin)}. Recommended bedtime is ${ctx.sleepPlan.recommendedBedtime} (target wake ${ctx.sleepPlan.targetWakeTime}), with 7-day Sleep Regularity at ${ctx.sleepPlan.regularityScorePct ?? '--'}%.`;
  }
  return `Live snapshot: Recovery ${ctx.recovery.score}% (${ctx.recovery.swcLabel}), Dual Strain ${ctx.strain.score}/21 (Cardio ${ctx.strain.cardioScore} / Muscular ${ctx.strain.muscularScore}), Uncoupled EWMA ${ctx.ewma.ratio ?? '--'}, and Sleep Regularity ${ctx.sleepPlan.regularityScorePct ?? '--'}%.`;
}
