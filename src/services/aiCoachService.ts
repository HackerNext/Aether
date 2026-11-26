import {
  BiologicalAgeMetrics,
  CardioLoadAcwr,
  ConnectedDevice,
  DailyBiometricRecord,
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
  acwr: CardioLoadAcwr;
  bioAge: BiologicalAgeMetrics;
  topCorrelations: HabitCorrelationResult[];
}

export function generateOfflineMorningBriefing(ctx: BiometricContextBundle): MorningBriefing {
  const { recovery, strain, sleepPlan, acwr, today } = ctx;

  if (!today || recovery.score === null) {
    return {
      headline: 'Ready to Connect Your Biometrics',
      summary:
        'AETHER starts completely clean with zero fake placeholder data. Sync Android Health Connect (via Mi Fitness / Zepp / Fitbit) or log your first morning metrics to unlock personalized recovery & strain guidance.',
      actionItems: [
        'Open the Vault tab and tap "Connect & Grant Permissions" to sync Android Health Connect with your smartwatch.',
        'Use the + Log tab to record today’s Habits, Strength session, Nutrition, or manual morning RHR & Sleep.',
        'Want to preview how charts look before syncing? Toggle "Preview Demo Mode" inside Vault → Settings.',
      ],
      generatedBy: 'aether_heuristic',
      generatedAtIso: new Date().toISOString(),
    };
  }

  let headline = 'Balanced Readiness — Build Steadily';
  if (recovery.state === 'optimal') headline = 'High Readiness — Green Light to Push';
  else if (recovery.state === 'low') headline = 'Low Recovery — Prioritize Restoration';

  const rhrPart =
    today.restingHrBpm !== null
      ? `RHR ${today.restingHrBpm} bpm (${recovery.rhrDeltaBpm! >= 0 ? '+' : ''}${recovery.rhrDeltaBpm} vs baseline)`
      : 'RHR not synced';
  const sleepPart =
    today.sleep && today.sleep.totalSleepMin > 0
      ? `${formatMinutesToHm(today.sleep.totalSleepMin)} sleep (${recovery.restorativeSleepPct ?? 0}% restorative)`
      : 'sleep not synced';

  const summary = `Recovery is ${recovery.score}% (${recovery.badgeLabel}) based on ${rhrPart} and ${sleepPart}. Current Strain is ${strain.score.toFixed(1)}/21 with ACWR at ${acwr.ratio ?? '--'} (${acwr.statusLabel}).`;

  const action1 =
    recovery.state === 'optimal'
      ? `Target ${strain.targetRange[0]}–${strain.targetRange[1]} Strain today with high-quality Zone 3–4 conditioning or progressive strength work.`
      : recovery.state === 'moderate'
        ? `Aim for ${strain.targetRange[0]}–${strain.targetRange[1]} Strain—steady Zone 2 endurance or controlled RPE 7–8 lifting.`
        : `Keep Strain below ${strain.targetRange[1]} today; focus on light walking, mobility, and early sleep recovery.`;

  const action2 = sleepPlan.hasSleepData
    ? `Recommended tonight bedtime is ${sleepPlan.recommendedBedtime} (${formatMinutesToHm(sleepPlan.recommendedDurationMin)} target) to manage your ${formatMinutesToHm(sleepPlan.rolling7dDebtMin)} 7-day sleep debt.`
    : `Wear your watch overnight (or log sleep manually) so AETHER can calculate rolling 7-day Sleep Debt and bedtime timing.`;

  const remainingWater = Math.max(0, ctx.profile.dailyWaterGoalMl - today.hydration.waterMl);
  const action3 =
    remainingWater > 400
      ? `Hydration is at ${today.hydration.waterMl} ml—drink ${remainingWater} ml more water before evening and log your habits in + Log.`
      : `Hydration goal is on track (${today.hydration.waterMl} ml). Cut off caffeine early to protect tonight's deep sleep.`;

  return {
    headline,
    summary,
    actionItems: [action1, action2, action3],
    generatedBy: 'aether_heuristic',
    generatedAtIso: new Date().toISOString(),
  };
}

function buildSystemPrompt(ctx: BiometricContextBundle): string {
  return `You are AETHER Coach, a concise, evidence-based biometric sports scientist.
Current User Telemetry:
- Connected Device: ${ctx.device.connected ? ctx.device.name : 'Not connected yet'}
- Recovery: ${ctx.recovery.score !== null ? `${ctx.recovery.score}% (${ctx.recovery.badgeLabel})` : 'No data synced yet'}
- Resting HR: ${ctx.today?.restingHrBpm ?? 'Not recorded'} bpm (30d baseline: ${ctx.recovery.rhrBaseline30d ?? '--'})
- Overnight HRV: ${ctx.today?.overnightHrvMs ?? 'Not exported (Proxy Mode)'}
- Daily Strain: ${ctx.strain.score}/21 (Muscular boost: +${ctx.strain.muscularStrainBoost})
- Sleep: ${ctx.today?.sleep ? formatMinutesToHm(ctx.today.sleep.totalSleepMin) : 'Not recorded'} | 7d Debt: ${formatMinutesToHm(ctx.sleepPlan.rolling7dDebtMin)} | Bedtime: ${ctx.sleepPlan.recommendedBedtime}
- ACWR: ${ctx.acwr.ratio ?? '--'} (${ctx.acwr.statusLabel})
- Biological Age: ${ctx.bioAge.biologicalAge ?? '--'} yrs (Chronological: ${ctx.bioAge.chronologicalAge})
Give concrete, readable, science-grounded advice referencing only real synced numbers. Never invent metrics that aren't present.`;
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
    // Fallback cleanly
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
            contents: [{ role: 'user', parts: [{ text: `${buildSystemPrompt(ctx)}\n\nQuestion: ${question}` }] }],
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
      // Fall back to offline reasoning
    }
  }

  if (!ctx.today || ctx.recovery.score === null) {
    return 'No biometric data is synced yet. Open the Vault tab to connect Android Health Connect (Mi Fitness / Redmi Watch 5 Lite), or log your morning RHR, Sleep, and Workouts in the + Log tab so I can analyze your personal numbers.';
  }

  const q = question.toLowerCase();
  if (q.includes('train') || q.includes('strain') || q.includes('workout')) {
    return `Recovery is ${ctx.recovery.score}% (${ctx.recovery.state}), giving you a target Strain window of ${ctx.strain.targetRange[0]}–${ctx.strain.targetRange[1]}. You are currently at ${ctx.strain.score.toFixed(1)} Strain (including +${ctx.strain.muscularStrainBoost.toFixed(1)} muscular boost) with ACWR at ${ctx.acwr.ratio ?? '--'} (${ctx.acwr.statusLabel}).`;
  }
  if (q.includes('sleep') || q.includes('bed') || q.includes('debt')) {
    return `You logged ${ctx.today.sleep ? formatMinutesToHm(ctx.today.sleep.totalSleepMin) : 'no sleep yet'}. Rolling 7-day sleep debt is ${formatMinutesToHm(ctx.sleepPlan.rolling7dDebtMin)}, and your recommended tonight bedtime is ${ctx.sleepPlan.recommendedBedtime} for a ${ctx.sleepPlan.targetWakeTime} wake-up.`;
  }
  return `Your live snapshot: Recovery ${ctx.recovery.score}% (${ctx.recovery.badgeLabel}), Strain ${ctx.strain.score.toFixed(1)}/21, RHR ${ctx.today.restingHrBpm ?? '--'} bpm, Sleep ${ctx.today.sleep ? formatMinutesToHm(ctx.today.sleep.totalSleepMin) : '--'}, and ACWR ${ctx.acwr.ratio ?? '--'}. Ask about training intensity, bedtime timing, or habit impacts.`;
}
