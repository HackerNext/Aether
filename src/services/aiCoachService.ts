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
  today: DailyBiometricRecord;
  recovery: RecoveryBreakdown;
  strain: StrainBreakdown;
  sleepPlan: SleepDebtPlan;
  acwr: CardioLoadAcwr;
  bioAge: BiologicalAgeMetrics;
  topCorrelations: HabitCorrelationResult[];
}

export function generateOfflineMorningBriefing(ctx: BiometricContextBundle): MorningBriefing {
  const { recovery, strain, sleepPlan, acwr, today } = ctx;

  let headline = 'Balanced Readiness — Build Steadily';
  if (recovery.state === 'optimal') {
    headline = 'Prime Physiological Readiness — Green Light to Push';
  } else if (recovery.state === 'low') {
    headline = 'Recovery Suppressed — Prioritize Down-Regulation';
  }

  const rhrSign = recovery.rhrDeltaBpm > 0 ? '+' : '';
  const summary =
    recovery.mode === 'hrv_native'
      ? `Recovery sits at ${recovery.score}% (HRV ${today.overnightHrvMs}ms, RHR ${today.restingHrBpm} bpm [${rhrSign}${recovery.rhrDeltaBpm} vs 30d]). Sleep reached ${formatMinutesToHm(today.sleep.totalSleepMin)} (${recovery.restorativeSleepPct}% restorative) with ACWR at ${acwr.ratio} (${acwr.statusLabel}).`
      : `Calibrated via ${ctx.device.name} (${recovery.badgeLabel}), Recovery is ${recovery.score}% with RHR at ${today.restingHrBpm} bpm (${rhrSign}${recovery.rhrDeltaBpm} vs 30d baseline) and ${recovery.restorativeSleepPct}% restorative Deep+REM sleep. ACWR is ${acwr.ratio} (${acwr.statusLabel}).`;

  const action1 =
    recovery.state === 'optimal'
      ? `Target a ${strain.targetRange[0]}–${strain.targetRange[1]} Strain session today (Zone 4 intervals or heavy compound lifting) while cardiovascular headroom is open.`
      : recovery.state === 'moderate'
        ? `Cap today's training near ${strain.targetRange[0]}–${strain.targetRange[1]} Strain—favor Zone 2 aerobic volume or crisp technical strength work.`
        : `Keep Strain under ${strain.targetRange[1]} today: swap high-intensity work for a 30m Zone 1 walk, mobility flow, and nasal breathing.`;

  const action2 =
    sleepPlan.rolling7dDebtMin >= 45
      ? `Clear ${formatMinutesToHm(sleepPlan.rolling7dDebtMin)} of 7-day sleep debt by starting wind-down at ${sleepPlan.recommendedBedtime} (target ${formatMinutesToHm(sleepPlan.recommendedDurationMin)} sleep).`
      : `Sleep debt is low (${formatMinutesToHm(sleepPlan.rolling7dDebtMin)}). Lock in tonight's ${sleepPlan.recommendedBedtime} bedtime to protect your ${ctx.bioAge.sleepConsistencyPct}% consistency.`;

  const topNeg = ctx.topCorrelations.find((c) => c.recoveryDeltaPct < -3);
  const topPos = ctx.topCorrelations.find((c) => c.deepSleepDeltaPct > 3 || c.recoveryDeltaPct > 3);
  const action3 =
    today.hydration.waterMl < ctx.profile.dailyWaterGoalMl * 0.75
      ? `Add ${ctx.profile.dailyWaterGoalMl - today.hydration.waterMl} ml water with electrolytes before 6 PM${topPos ? `, and repeat "${topPos.label}" (+${Math.max(topPos.recoveryDeltaPct, topPos.deepSleepDeltaPct)}% biometric lift)` : ''}.`
      : topNeg
        ? `Avoid "${topNeg.label}" tonight (historically ${topNeg.recoveryDeltaPct}% next-day recovery) to preserve tomorrow's RHR baseline.`
        : `Keep caffeine cut off before 2 PM and log your evening nutrition to keep recovery calibration sharp.`;

  return {
    headline,
    summary,
    actionItems: [action1, action2, action3],
    generatedBy: 'aether_heuristic',
    generatedAtIso: new Date().toISOString(),
  };
}

function buildSystemPrompt(ctx: BiometricContextBundle): string {
  return `You are AETHER Coach, a concise, elite biometric sports scientist and recovery strategist.
User Telemetry Snapshot:
- Connected Wearable: ${ctx.device.name} (${ctx.device.ecosystem}, Mode: ${ctx.recovery.badgeLabel})
- Recovery: ${ctx.recovery.score}% (${ctx.recovery.state.toUpperCase()})
- Resting HR: ${ctx.today.restingHrBpm} bpm (30d baseline ${ctx.recovery.rhrBaseline30d} bpm, delta ${ctx.recovery.rhrDeltaBpm} bpm)
- Overnight HRV: ${ctx.today.overnightHrvMs !== null ? `${ctx.today.overnightHrvMs} ms` : 'Unavailable (RHR+Sleep Proxy Active)'}
- Today Strain: ${ctx.strain.score}/21 (Muscular boost: +${ctx.strain.muscularStrainBoost}, Target: ${ctx.strain.targetRange[0]}–${ctx.strain.targetRange[1]})
- Sleep: ${formatMinutesToHm(ctx.today.sleep.totalSleepMin)} (${ctx.recovery.restorativeSleepPct}% Deep+REM, ${ctx.recovery.sleepEfficiencyPct}% efficiency)
- 7d Sleep Debt: ${formatMinutesToHm(ctx.sleepPlan.rolling7dDebtMin)} | Recommended Bedtime: ${ctx.sleepPlan.recommendedBedtime}
- Cardio Load ACWR: ${ctx.acwr.ratio} (${ctx.acwr.statusLabel})
- Biological Age: ${ctx.bioAge.biologicalAge} yrs (Chronological: ${ctx.bioAge.chronologicalAge}, Pace: ${ctx.bioAge.healthspanPace}x)
- SpO2: ${ctx.today.spo2Pct}% | Steps: ${ctx.today.steps} | Water: ${ctx.today.hydration.waterMl}ml | Caffeine: ${ctx.today.hydration.caffeineMg}mg
- Top Habit Correlations: ${ctx.topCorrelations
    .slice(0, 4)
    .map((c) => `${c.label} (Rec ${c.recoveryDeltaPct >= 0 ? '+' : ''}${c.recoveryDeltaPct}%, Deep ${c.deepSleepDeltaPct >= 0 ? '+' : ''}${c.deepSleepDeltaPct}%)`)
    .join('; ')}

Respond with direct, concrete, science-grounded advice referencing these exact numbers. Avoid fluff.`;
}

export async function generateGeminiBriefing(
  ctx: BiometricContextBundle
): Promise<MorningBriefing> {
  const apiKey = ctx.profile.geminiApiKey.trim();
  if (!apiKey) {
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
                  text: `${buildSystemPrompt(ctx)}\n\nReturn strict JSON ONLY with keys: {"headline": string (<=8 words), "summary": string (2 crisp sentences), "actionItems": [string, string, string] (exactly 3 concrete daily actions)}.`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText);

    if (parsed?.headline && parsed?.summary && Array.isArray(parsed?.actionItems)) {
      return {
        headline: String(parsed.headline),
        summary: String(parsed.summary),
        actionItems: parsed.actionItems.slice(0, 3).map(String),
        generatedBy: 'gemini',
        generatedAtIso: new Date().toISOString(),
      };
    }
    throw new Error('Unexpected Gemini JSON schema');
  } catch {
    return generateOfflineMorningBriefing(ctx);
  }
}

export async function askAetherCoach(
  question: string,
  ctx: BiometricContextBundle
): Promise<string> {
  const apiKey = ctx.profile.geminiApiKey.trim();

  if (apiKey) {
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
                parts: [{ text: `${buildSystemPrompt(ctx)}\n\nUser Question: ${question}` }],
              },
            ],
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
      // Fall through cleanly to offline biometric reasoning engine
    }
  }

  const q = question.toLowerCase();
  const { recovery, strain, sleepPlan, acwr, bioAge, today } = ctx;

  if (q.includes('train') || q.includes('workout') || q.includes('lift') || q.includes('run') || q.includes('strain')) {
    return `With Recovery at ${recovery.score}% (${recovery.state}) and ACWR at ${acwr.ratio} (${acwr.statusLabel}), your optimal Strain corridor today is ${strain.targetRange[0]}–${strain.targetRange[1]}. You're currently at ${strain.score} Strain (${strain.muscularStrainBoost > 0 ? `including +${strain.muscularStrainBoost} muscular load` : 'cardio only'}). ${
      recovery.score >= 67
        ? 'You have green-light capacity for high-intensity intervals or progressive overload strength work.'
        : recovery.score >= 34
          ? 'Stick to controlled Zone 2 cardio or moderate RPE 7–8 strength sets without chasing failure.'
          : 'Dial intensity down to Zone 1 recovery movement and mobility so your RHR rebounds tomorrow.'
    }`;
  }

  if (q.includes('sleep') || q.includes('bed') || q.includes('tired') || q.includes('debt')) {
    return `Last night you logged ${formatMinutesToHm(today.sleep.totalSleepMin)} (${recovery.restorativeSleepPct}% Deep+REM, ${recovery.sleepEfficiencyPct}% efficiency). Your rolling 7-day sleep debt sits at ${formatMinutesToHm(sleepPlan.rolling7dDebtMin)}. To stay aligned with your ${sleepPlan.targetWakeTime} wake target after today's ${strain.score} Strain, aim to be lights-out by ${sleepPlan.recommendedBedtime} for ${formatMinutesToHm(sleepPlan.recommendedDurationMin)} total sleep.`;
  }

  if (q.includes('redmi') || q.includes('hrv') || q.includes('proxy') || q.includes('watch')) {
    return `Your ${ctx.device.name} is operating in ${recovery.badgeLabel} mode. ${
      recovery.mode === 'rhr_sleep_proxy'
        ? `Because Redmi Watch 5 Lite doesn't export continuous overnight RMSSD HRV to Health Connect, AETHER automatically weights 55% Overnight RHR deviation (${today.restingHrBpm} vs ${recovery.rhrBaseline30d} bpm 30d baseline), 30% Restorative Sleep (${recovery.restorativeSleepPct}%), and 15% Sleep Efficiency (${recovery.sleepEfficiencyPct}%).`
        : `Overnight RMSSD HRV (${today.overnightHrvMs} ms) is actively weighted at 50% alongside RHR (30%) and Sleep Performance (20%).`
    }`;
  }

  if (q.includes('habit') || q.includes('impact') || q.includes('magnesium') || q.includes('coffee') || q.includes('caffeine')) {
    const top = ctx.topCorrelations.slice(0, 3);
    if (top.length > 0) {
      return `Your strongest personal habit signals across ${ctx.topCorrelations[0].sampleDaysWith + ctx.topCorrelations[0].sampleDaysWithout} tracked days:\n${top
        .map(
          (c) =>
            `• ${c.label}: ${c.recoveryDeltaPct >= 0 ? '+' : ''}${c.recoveryDeltaPct}% Recovery, ${c.deepSleepDeltaPct >= 0 ? '+' : ''}${c.deepSleepDeltaPct}% Deep Sleep`
        )
        .join('\n')}`;
    }
  }

  if (q.includes('age') || q.includes('vo2') || q.includes('longevity')) {
    return `Your 30-day Biological Age is ${bioAge.biologicalAge} yrs (${bioAge.deltaYears <= 0 ? `${Math.abs(bioAge.deltaYears)} yrs younger` : `+${bioAge.deltaYears} yrs older`} than chronological ${bioAge.chronologicalAge}), pacing at ${bioAge.healthspanPace}x. Key drivers: 30d RHR average ${bioAge.rhr30dAvg} bpm, estimated VO2 Max ${bioAge.vo2Max30dAvg} mL/kg/min, and ${bioAge.sleepConsistencyPct}% sleep consistency.`;
  }

  return `Snapshot from ${ctx.device.name}: Recovery ${recovery.score}% (${recovery.state}), Strain ${strain.score}/21 (target ${strain.targetRange[0]}–${strain.targetRange[1]}), Sleep ${formatMinutesToHm(today.sleep.totalSleepMin)} (debt ${formatMinutesToHm(sleepPlan.rolling7dDebtMin)}), and ACWR ${acwr.ratio} (${acwr.statusLabel}). Ask me about today's training target, tonight's bedtime, your habit correlations, or Biological Age drivers.`;
}
