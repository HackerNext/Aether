export interface ScienceDocChapter {
  id: string;
  category: 'recovery' | 'strain' | 'sleep' | 'longevity' | 'habits' | 'sensors';
  title: string;
  subtitle: string;
  plainEnglish: string;
  howWeCalculate: string[];
  whatToWatchFor: string;
}

export const SCIENCE_DOC_CHAPTERS: ScienceDocChapter[] = [
  {
    id: 'zscore_swc',
    category: 'recovery',
    title: 'Personal Baselines, Z-Scores & Normal Noise (±0.5σ)',
    subtitle: 'Why we compare you only to your own 30-day average — not population charts',
    plainEnglish:
      'Everyone’s resting heart rate is different. A 54 bpm morning might be normal for one person and unusually high for another. Instead of judging your raw number against a generic chart, AETHER tracks your personal 30-day average and how much your body normally bounces up and down each day (your standard deviation, written as σ).',
    howWeCalculate: [
      'Every morning, we take today’s Resting Heart Rate minus your 30-day average, then divide by your normal day-to-day spread (Z-score).',
      'Any shift inside ±0.5σ is called the Smallest Worthwhile Change (SWC) band — we label it "Normal Baseline Noise" so you don’t stress over tiny meaningless wobbles like 55 vs 56 bpm.',
      'A jump above +1.0σ means your body is working harder to recover (poor sleep, heavy training, dehydration, or coming down with a cold).',
      'Bidirectional safety check: If your heart rate drops unusually low (below -1.8σ) AND you tell us you feel exhausted, AETHER flags possible deep nervous-system fatigue instead of blindly giving you a green score.',
    ],
    whatToWatchFor:
      'Ignore 3–5% daily score wobbles. Pay attention when your Resting HR climbs outside your normal band for 2+ days in a row.',
  },
  {
    id: 'adaptive_recovery',
    category: 'recovery',
    title: 'Adaptive Recovery Score (HRV Native vs Redmi Proxy Mode)',
    subtitle: 'How AETHER calibrates accurately even when your watch doesn’t export overnight HRV',
    plainEnglish:
      'Recovery estimates how ready your body is to handle stress today on a 0–100% scale. Some watches export overnight Heart Rate Variability (HRV), while popular watches like the Redmi Watch 5 Lite export Resting Heart Rate and Sleep instead. AETHER detects what your watch provides and automatically chooses the best formula.',
    howWeCalculate: [
      'When overnight HRV is NOT present (Redmi Proxy Mode): 50% RHR Z-Score + 35% Total Sleep Duration vs your personal need + 15% Optical Sleep Stages (capped low on purpose because wrist watches are only ~65% accurate at telling Deep from Light sleep).',
      'When overnight HRV IS present (Native Mode): 50% HRV Z-Score + 30% RHR Z-Score + 20% Sleep Performance.',
      'When you complete the 15-second Morning Wellness Check-In, your subjective feel blends in at 25% weight so the score reflects both your watch AND how you genuinely feel.',
    ],
    whatToWatchFor:
      'Green (67–100%) = ready for hard training. Amber (34–66%) = steady moderate work. Red (0–33%) = prioritize easy movement and sleep.',
  },
  {
    id: 'hooper_override',
    category: 'recovery',
    title: '15-Second Morning Wellness (Hooper Index) & Perception Override',
    subtitle: 'Why 4 quick sliders catch soreness and stress that smartwatches miss',
    plainEnglish:
      'No smartwatch on earth can feel sore quads, exam stress, a scratchy throat, or low iron. In pro sports science, the 4-question Hooper Check-In (Sleep Quality, Freshness, Stress, Muscle Soreness) often detects overtraining days earlier than heart rate alone.',
    howWeCalculate: [
      'You slide 4 ratings from 1 to 7 in under 15 seconds inside the Log tab (or from Today’s home card).',
      'We convert them into the Hooper Index (4 = feeling amazing, 28 = completely drained) and a clean 0–100 Wellness Score.',
      'Perception Override: If your watch says your heart rate looks "Green" (≥66%), yet you report high fatigue, severe soreness (≥5/7), or heavy stress (≥6/7), AETHER caps your readiness and shows a warning so you never push blindly into burnout.',
    ],
    whatToWatchFor:
      'Always trust your body over a watch. Logging these 4 sliders takes 15 seconds and also auto-calibrates your personal sleep need over time.',
  },
  {
    id: 'dual_strain',
    category: 'strain',
    title: 'Dual Cardio & Muscular Strain (0–21 Scale) + Observed Max HR',
    subtitle: 'Separating heart-lung stress from muscle breakdown so strength workouts count accurately',
    plainEnglish:
      'A hard 5 km run taxes your heart and lungs; heavy push-ups, squats, or pull-ups tear down muscle fibers even when your wrist heart rate stays low. Mixing them invisibly hides which system actually needs rest. AETHER shows one 0–21 Strain ring for a quick glance, plus two separate bars inside the Strain page.',
    howWeCalculate: [
      'Cardiovascular Bar: Counts minutes in Heart Rate Zones 1–5 (with harder zones weighted exponentially) PLUS optional Session RPE × Duration (Foster method) so short sprints or football bursts count even if wrist HR lags.',
      'Muscular Bar: Calculates Sets × Reps × Load (using 58% of your body weight for bodyweight moves) scaled by how hard the set felt (RPE), plus any heavy morning soreness carry-over.',
      'Logarithmic 0–21 curve: Reaching Strain 8 is easy (daily walking), 14 is a solid workout, and 18+ takes extreme endurance.',
      'Observed Peak HR: Generic "220 − Age" can be off by ±12 bpm. You can enter the highest true heart rate you’ve seen during an all-out climb or sprint in Settings, and AETHER updates it automatically if a future workout beats it.',
    ],
    whatToWatchFor:
      'If your Muscular bar is high while Cardio is low, do light cycling or walking tomorrow instead of lifting the same muscle group.',
  },
  {
    id: 'ewma_monotony',
    category: 'strain',
    title: 'Uncoupled EWMA Workload & Training Monotony',
    subtitle: 'Smarter injury-risk tracking that fixes the flaws in classic ACWR',
    plainEnglish:
      'If you suddenly double your weekly training after doing very little, injury risk climbs. Classic ratios (ACWR) had two flaws: they mixed this week inside the monthly average, and they panicked after a normal rest week. AETHER fixes both.',
    howWeCalculate: [
      'Acute Load (7-day EWMA): Smoothly averages your recent week, giving yesterday more weight than 6 days ago.',
      'Uncoupled Chronic Load (28-day EWMA): Averages your fitness base strictly BEFORE the last 7 days so the two numbers don’t artificially distort each other.',
      'Minimum Base Floor (< 4.0): If you are returning from a rest week or exams, AETHER pauses "Overreaching" alerts and shows "Rebuilding Base" instead of scaring you.',
      'Training Monotony (Weekly Mean ÷ Weekly Spread): If you grind the exact same medium-hard workout every single day with zero easy days, Monotony crosses 2.0 and flags that you need contrast between hard and easy days.',
    ],
    whatToWatchFor:
      'Aim for a 0.80–1.30 Balanced Build Zone and keep Weekly Monotony under 2.0 by taking genuine rest or light days.',
  },
  {
    id: 'sleep_regularity',
    category: 'sleep',
    title: 'Adaptive Personal Sleep Need & 7-Day Sleep Regularity',
    subtitle: 'No more fake "8-hour sleep debt" anxiety — calibrated to what makes YOU feel fresh',
    plainEnglish:
      'Not everyone needs exactly 8 hours. Forcing an 8-hour rule onto someone who feels great on 7h 15m creates unnecessary sleep anxiety. Research also shows going to bed and waking up at consistent times matters just as much as total hours.',
    howWeCalculate: [
      'Personal Sleep Need: Starts at your chosen target (default 7h 30m). Once you log 4+ mornings where you felt genuinely fresh (≥5/7 on the Hooper check-in), AETHER can auto-calibrate to your own median sleep duration on those fresh nights.',
      '7-Day Sleep Regularity (0–100%): Measures how tight your nightly bedtime window is over the past week. Less variation = higher score.',
      'Realistic Bedtime Planner: Adds a small recovery buffer after hard workouts and caps suggested bedtime shifts to ±45 minutes from your normal schedule so you never get impossible 2-hour early bedtime recommendations.',
    ],
    whatToWatchFor:
      'Treat wrist Deep/REM minutes as rough estimates, and focus first on Total Sleep Duration and a consistent Bedtime/Wake window.',
  },
  {
    id: 'fitness_age',
    category: 'longevity',
    title: 'Cardiovascular & Sleep Fitness Age (Honest Longevity Framing)',
    subtitle: 'Anchored to real running field tests — not pretending to be a DNA blood test',
    plainEnglish:
      'Smartwatches cannot measure cellular DNA aging, so AETHER honestly calls this "Cardiovascular & Sleep Fitness Age." It summarizes how strong your heart-lung engine and sleep rhythm look compared to typical benchmarks for your calendar age.',
    howWeCalculate: [
      'VO2 Max Priority 1 (Most Accurate): Enter a real Cooper 12-Minute Run distance (meters) or a 5 km time-trial in the Fitness Age page to calculate your field-tested VO2 Max directly.',
      'VO2 Max Fallback: If no field test is entered, AETHER uses your watch’s VO2 Max or estimates it from your Max HR ÷ 30-day Resting HR ratio.',
      'Combines VO2 Max, 30-day Resting HR, and 30-day Sleep Regularity into an estimated Fitness Age and Healthspan Pace (<1.00× means your heart & sleep habits are outperforming your calendar age).',
    ],
    whatToWatchFor:
      'If you have a naturally low resting heart rate genetically, enter a real 12-minute run or 5 km time so your VO2 Max isn’t artificially inflated.',
  },
  {
    id: 'habit_gates',
    category: 'habits',
    title: 'Habit Impact Lab: Sample Gates & 95% Confidence Ranges',
    subtitle: 'Why habits stay locked until you have enough real days to trust the math',
    plainEnglish:
      'If you only log Magnesium twice and happen to sleep well both nights, a naive app screams "+18% Deep Sleep!" — which is usually just coincidence. AETHER refuses to show misleading noise.',
    howWeCalculate: [
      'Sample Gate: Every habit stays locked behind a progress bar until you have at least 7 nights WITH the habit AND 7 nights WITHOUT the habit paired with next-morning biometrics.',
      'Once unlocked, we compare your average next-morning Recovery and Deep Sleep on logged days vs unlogged days.',
      '95% Confidence Range (±X%): Shown right next to the average so you can see whether an effect is rock-solid (e.g. +8% ± 2.1%) or still noisy (+5% ± 9.4%).',
    ],
    whatToWatchFor:
      'Remember correlation isn’t always causation — notice whether two habits always happen together (like late meals + late screen time).',
  },
  {
    id: 'sensor_limits',
    category: 'sensors',
    title: 'Optical Watch Accuracy, Health Connect & Offline Lab Vault',
    subtitle: 'What wrist sensors do well, what they miss, and why blood work completes the picture',
    plainEnglish:
      'Optical green/infrared LED sensors on your wrist are great for Resting Heart Rate, total sleep hours, and steady-state cardio (like jogging or cycling). They are weaker during rapid wrist movement, heavy lifting, and distinguishing Deep vs REM sleep.',
    howWeCalculate: [
      'Android Health Connect Bridge (SDK 1.1.0): Reads real daily aggregated Steps, Calories, RHR, HR Zones, Sleep, SpO2, and Workouts written by Xiaomi Mi Fitness, Zepp, Fitbit, or Samsung Health — safely skipping malformed timestamps.',
      'Watch battery % is never faked: Health Connect does not share watch battery, so AETHER only shows battery when paired directly to a BLE strap reporting GATT service 0x180F.',
      'Offline Medical & Lab Vault: Stores your real blood work (Vitamin D3, B12, Hemoglobin, Ferritin, Glucose, Lipids, hs-CRP) strictly on your phone against athletic optimal bands.',
    ],
    whatToWatchFor:
      'Wear your watch snug (1 finger above the wrist bone) during sleep and workouts for cleaner heart-rate readings.',
  },
];
