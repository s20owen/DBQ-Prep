const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'dbq_json');
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'dbq-catalog.js');
const JSON_FILES = fs.readdirSync(DATA_DIR).filter((file) => file.endsWith('.json') && !file.startsWith('_')).sort();

const GUARDRAIL = 'Fill in only what is true. Skip wording that does not apply. Do not exaggerate, invent symptoms, stressors, exposures, test results, or medical nexus opinions.';
const COMMON_FIELDS = [
  'severity',
  'frequency',
  'duration',
  'bestPain',
  'worstPain',
  'flareUps',
  'triggers',
  'limitation',
  'treatment',
  'flareCare',
  'limitBeforeStopping',
  'onset',
  'serviceEvent',
  'currentDiagnosis',
  'workImpact',
  'dailyImpact'
];

const SHARED = {
  severity: 'Moderate to severe',
  frequency: 'Daily',
  duration: 'several hours at a time',
  bestPain: '4/10',
  worstPain: '8/10',
  flareUps: '3 times per month',
  triggers: 'activity, stress, or repeated use',
  limitation: 'work reliability, chores, driving, sleep, and daily activities',
  treatment: 'medication, rest, and medical follow-up',
  flareCare: 'rest, medication, pacing, and avoiding triggers',
  limitBeforeStopping: '20–30 minutes',
  onset: 'around [timeframe]',
  serviceEvent: '[specific service event, injury, exposure, aggravation, or secondary condition]',
  currentDiagnosis: '[diagnosis or claimed condition]',
  workImpact: 'I need breaks, work slower, avoid certain tasks, or miss time when symptoms flare.',
  dailyImpact: 'I plan activities around symptoms and need extra time, rest, or help with harder tasks.'
};

function merge(...parts) {
  return Object.assign({}, ...parts.filter(Boolean));
}

const KIND_DEFAULTS = {
  musculoskeletal: {
    mainSymptoms: 'pain, stiffness, weakness, limited motion, fatigue with repeated use, and flare-ups',
    frequency: 'Daily with a constant baseline and worse periods',
    duration: 'constant baseline pain with flares lasting hours to days',
    triggers: 'standing, walking, bending, lifting, stairs, weather changes, and repeated use',
    limitation: 'standing, walking, sitting, lifting, bending, stairs, driving, chores, and exercise',
    treatment: 'NSAIDs or pain medication, physical therapy, brace/support, ice/heat, stretching, and rest',
    flareCare: 'ice or heat, rest, stretching, medication, bracing, and reducing activity',
    workImpact: 'I have to change positions, take breaks, avoid lifting or repetitive tasks, and I work slower during pain flares.',
    dailyImpact: 'Chores, stairs, shopping, driving, sleep, and getting dressed take longer or require help during bad days.'
  },
  neurological: {
    mainSymptoms: 'numbness, tingling, weakness, tremor, balance problems, fatigue, pain, or coordination issues',
    frequency: 'Daily or most days',
    duration: 'hours at a time, with worse episodes lasting the rest of the day',
    triggers: 'fatigue, heat, stress, activity, poor sleep, or overexertion',
    limitation: 'walking, balance, fine motor tasks, concentration, driving, safety, and work pace',
    treatment: 'neurology care, prescribed medication, therapy, assistive devices if prescribed, pacing, and rest',
    flareCare: 'rest, cooling, medication, reducing activity, and using support or assistive devices if prescribed',
    workImpact: 'Symptoms slow my work pace, increase mistakes, create safety concerns, and require breaks or task changes.',
    dailyImpact: 'I have to pace activities, avoid overexertion, and may need help with driving, chores, or detailed tasks.'
  },
  tbi: {
    mainSymptoms: 'memory problems, poor concentration, slowed thinking, headaches, dizziness/balance problems, light or noise sensitivity, irritability, sleep disruption, and fatigue if true',
    frequency: 'Daily or most days',
    duration: 'hours at a time, with bad episodes affecting the rest of the day',
    bestPain: '4/10',
    worstPain: '8/10',
    flareUps: 'several times per week',
    triggers: 'screens, reading, bright light, noise, crowds, stress, poor sleep, driving, multitasking, or physical exertion',
    limitation: 'memory, concentration, task completion, driving, reading/screens, balance, headaches, communication, mood, and work reliability',
    treatment: 'TBI/neurology care, primary care, headache medication if prescribed, therapy/rehab, memory aids, sleep treatment, vestibular/vision therapy if prescribed, and pacing',
    flareCare: 'stop the task, reduce light/noise, rest in a quiet place, use medication if prescribed, use notes/reminders, avoid driving, and ask for help if needed',
    limitBeforeStopping: '20–30 minutes of screens, reading, multitasking, or busy/noisy settings',
    workImpact: 'I lose track of multi-step tasks, forget instructions unless I write them down, make more mistakes when interrupted, avoid busy/noisy areas, and may need extra time or reminders.',
    dailyImpact: 'I rely on calendars, phone alarms, notes, GPS, routines, and help from others; headaches, dizziness, or brain fog can limit errands, driving, bills, chores, and conversations.'
  },
  mental: {
    mainSymptoms: 'sleep problems, anxiety, panic, irritability, depression, intrusive memories, avoidance, concentration problems, and social withdrawal',
    frequency: 'Most days',
    duration: 'hours at a time, with sleep disruption carrying into the next day',
    bestPain: '4/10 emotionally',
    worstPain: '8/10 emotionally',
    flareUps: 'several times per week',
    triggers: 'crowds, reminders, stress, conflict, loud noise, poor sleep, or feeling trapped',
    limitation: 'sleep, concentration, mood, relationships, crowds, motivation, and work reliability',
    treatment: 'mental health treatment, therapy tools, medication if prescribed, grounding, isolation, and support from trusted people',
    flareCare: 'step away, ground myself, use paced breathing, isolate briefly, take medication if prescribed, and contact support',
    limitBeforeStopping: '30–60 minutes',
    workImpact: 'I lose track of tasks, reread instructions, avoid meetings or customer contact, get irritable when interrupted, and may need to leave the area to calm down.',
    dailyImpact: 'I avoid crowded stores and family events, isolate in a room, sleep poorly, put off chores or hygiene, and need reminders or support when symptoms are active.'
  },
  headache: {
    mainSymptoms: 'head pain, throbbing or pulsating pain, nausea, light sensitivity, sound sensitivity, vision changes, and needing to lie down if true',
    frequency: '2–4 headache episodes per month',
    duration: '4–24 hours',
    flareUps: '2–4 severe attacks per month',
    triggers: 'light, noise, stress, poor sleep, screens, heat, or certain smells',
    limitation: 'screens, driving, concentration, meetings, attendance, and productivity',
    treatment: 'prescribed medication, over-the-counter medication if used, dark-room rest, hydration, sleep, and avoiding triggers',
    flareCare: 'lying down in a dark quiet room, medication, hydration, sleep, and avoiding light/noise',
    limitBeforeStopping: '15–30 minutes once a severe headache starts',
    workImpact: 'During severe attacks I cannot concentrate, use screens, drive safely, or stay productive, and I may need to leave work or miss work.',
    dailyImpact: 'I cancel plans, avoid light and noise, lie down, and need help with chores or childcare during severe attacks.'
  },
  hearing: {
    mainSymptoms: 'difficulty hearing speech, trouble understanding conversations in background noise, ringing or buzzing tinnitus, and communication strain',
    frequency: 'Constant or daily',
    duration: 'constant or recurring throughout the day',
    bestPain: 'noticeable but manageable',
    worstPain: 'severe enough to interfere with communication or sleep',
    flareUps: 'worse episodes several times per week',
    triggers: 'background noise, meetings, phone calls, radios, alarms, quiet rooms, or loud environments',
    limitation: 'conversations, phone calls, meetings, alarms, instructions, sleep, and safety awareness',
    treatment: 'audiology care, hearing protection, hearing aids if prescribed, masking strategies, and avoiding loud noise',
    flareCare: 'use hearing protection, reduce background noise, ask for repetition, request written instructions, or rest in a quiet place',
    limitBeforeStopping: 'one conversation or meeting when background noise is present',
    workImpact: 'I miss instructions, ask people to repeat themselves, struggle on the phone or radio, and worry about missing alarms or safety signals.',
    dailyImpact: 'Conversations, TV, phone calls, restaurants, family events, and sleep are affected.'
  },
  sleep: {
    mainSymptoms: 'snoring, witnessed apneas, choking/gasping, unrestful sleep, morning headaches, daytime sleepiness, fatigue, and concentration problems if true',
    frequency: 'Nightly',
    duration: 'all night with next-day fatigue lasting hours',
    bestPain: 'manageable tiredness',
    worstPain: 'severe daytime sleepiness or unsafe fatigue',
    flareUps: 'several times per week',
    triggers: 'mask/device problems, congestion, sleeping position, poor sleep, pain, stress, or not using prescribed treatment',
    limitation: 'daytime alertness, concentration, driving safety, mood, morning headaches, and work reliability',
    treatment: 'CPAP/BiPAP or oral appliance if prescribed, sleep medicine follow-up, mask supplies, sleep hygiene, and nasal/weight treatment if recommended',
    flareCare: 'use prescribed sleep equipment, correct mask fit, treat congestion if directed, nap/rest, and avoid drowsy driving',
    limitBeforeStopping: 'a few hours of poor sleep or a drowsy morning',
    workImpact: 'Poor sleep makes me tired, less focused, slower, irritable, and less reliable, and I avoid driving or safety-sensitive tasks when drowsy.',
    dailyImpact: 'I may need naps, extra caffeine/rest, help staying on task, and planning around fatigue after bad sleep.'
  },
  respiratory: {
    mainSymptoms: 'shortness of breath, coughing, wheezing, chest tightness, congestion, fatigue, or reduced exercise tolerance',
    frequency: 'Daily or several times per week',
    duration: 'minutes to hours, with worse days lasting most of the day',
    flareUps: '2–4 flare-ups per month',
    triggers: 'exertion, smoke, dust, cold air, allergens, infections, humidity, or fumes',
    limitation: 'walking, stairs, exercise, yard work, sleep, talking during exertion, and work pace',
    treatment: 'inhalers or respiratory medication if prescribed, nasal sprays if used, CPAP if prescribed, avoidance of triggers, and medical follow-up',
    flareCare: 'use prescribed medication, slow down, rest, avoid triggers, hydrate, and seek care if symptoms worsen',
    workImpact: 'I have to slow down, avoid dusty or fume-heavy areas, take breaks after stairs or exertion, and may miss work during infections or flares.',
    dailyImpact: 'Stairs, walking, chores, sleep, and outdoor activities take longer and require pacing.'
  },
  cardio: {
    mainSymptoms: 'chest discomfort, shortness of breath, dizziness, palpitations, fatigue, swelling, or exercise intolerance if true',
    frequency: 'Daily or with exertion',
    duration: 'minutes to hours depending on activity and symptoms',
    flareUps: 'worse episodes several times per month',
    triggers: 'exertion, stairs, heat, stress, missed medication, or prolonged standing',
    limitation: 'stairs, walking distance, lifting, yard work, exercise, driving safety, and work pace',
    treatment: 'prescribed heart or blood pressure medication, monitoring, lifestyle changes, cardiology follow-up, and activity limits if prescribed',
    flareCare: 'resting, monitoring symptoms or blood pressure if directed, taking medication as prescribed, and seeking urgent care for dangerous symptoms',
    workImpact: 'I have to limit exertion, take breaks, avoid heavy lifting, and monitor symptoms during stressful or active work.',
    dailyImpact: 'Exercise, stairs, shopping, chores, heat exposure, and long days require planning and pacing.'
  },
  gi: {
    mainSymptoms: 'abdominal pain, nausea, reflux, vomiting, diarrhea, constipation, urgency, bloating, bleeding, or appetite/weight changes if true',
    frequency: 'Several times per week or daily during flares',
    duration: 'hours at a time, with flares lasting one or more days',
    flareUps: '2–4 flares per month',
    triggers: 'certain foods, stress, medication, activity, eating late, or flare-ups',
    limitation: 'bathroom access, meals, travel, meetings, long drives, sleep, and work reliability',
    treatment: 'medication, diet changes, hydration, fiber or supplements if used, procedures/testing, and medical follow-up',
    flareCare: 'staying near a bathroom, changing diet, hydration, medication, rest, and avoiding trigger foods',
    workImpact: 'I need urgent bathroom access, extra breaks, meal planning, and may miss or leave work during severe flares.',
    dailyImpact: 'Meals, errands, travel, social plans, sleep, and chores are planned around symptoms and bathroom access.'
  },
  gu: {
    mainSymptoms: 'urinary frequency, urgency, leakage, pain, infections, kidney/flank pain, sexual/reproductive symptoms, or fatigue if true',
    frequency: 'Daily or several times per week',
    duration: 'throughout the day or in episodes lasting hours',
    flareUps: '2–4 flares per month',
    triggers: 'fluid intake, activity, pain, infection, stress, intimacy, or flare-ups',
    limitation: 'bathroom access, sleep, travel, intimacy, work reliability, lifting, and daily planning',
    treatment: 'medication, pads or devices if prescribed/used, procedures, lab monitoring, specialist care, and medical follow-up',
    flareCare: 'staying near a bathroom, hydration as directed, medication, rest, hygiene measures, and seeking care for infections or worsening symptoms',
    workImpact: 'I need frequent bathroom breaks, may have disrupted sleep, and have to plan meetings, travel, and tasks around symptoms.',
    dailyImpact: 'Sleep, errands, intimacy, exercise, travel, and social activities are affected by symptoms and planning needs.'
  },
  skin: {
    mainSymptoms: 'itching, pain, burning, rash, lesions, scarring, skin breakdown, sensitivity, or disfigurement if true',
    frequency: 'Daily or during recurring flares',
    duration: 'days to weeks during flares',
    flareUps: 'several times per month',
    triggers: 'heat, sweating, friction, shaving, chemicals, sun exposure, stress, or clothing irritation',
    limitation: 'clothing choices, sleep, movement, shaving, work tasks, social comfort, and avoiding irritation',
    treatment: 'topical medication, oral medication if prescribed, dressings, moisturizers, procedures, and avoiding triggers',
    flareCare: 'topicals, dressings, keeping the area clean/dry, avoiding friction or heat, and rest if painful',
    workImpact: 'I avoid heat, friction, chemicals, uniforms, or tasks that irritate the area and may need breaks to manage symptoms.',
    dailyImpact: 'Sleep, clothing, bathing, shaving, exercise, intimacy, and social situations are affected during flares.'
  },
  endocrine: {
    mainSymptoms: 'fatigue, weight change, heat/cold intolerance, weakness, mood changes, blood sugar symptoms, or medication side effects if true',
    frequency: 'Daily or when levels are not controlled',
    duration: 'hours to all day depending on symptoms',
    flareUps: 'several times per month',
    triggers: 'missed meals, activity, stress, illness, heat/cold, medication timing, or hormone/blood sugar changes',
    limitation: 'energy, concentration, stamina, appointments, medication timing, diet planning, and work reliability',
    treatment: 'prescribed medication, monitoring/labs, diet changes, specialist follow-up, and lifestyle adjustments',
    flareCare: 'rest, checking levels if directed, medication as prescribed, food/hydration planning, and contacting care team if needed',
    workImpact: 'I have to plan meals/medications, manage fatigue, attend monitoring visits, and take breaks when symptoms interfere.',
    dailyImpact: 'Energy, meals, exercise, sleep, errands, and appointments require planning around symptoms and treatment.'
  },
  dental: {
    mainSymptoms: 'jaw pain, tooth loss, chewing problems, speech changes, mouth pain, infections, or limited opening if true',
    frequency: 'Daily or with chewing/talking',
    duration: 'minutes to hours after use, with flares lasting longer',
    flareUps: 'several times per month',
    triggers: 'chewing, talking, hard foods, dental appliances, stress, or jaw clenching',
    limitation: 'chewing, speaking, diet choices, sleep, work communication, and social comfort',
    treatment: 'dental care, mouth guard or appliance if prescribed, medication, soft diet, procedures, and follow-up care',
    flareCare: 'soft foods, rest, medication, heat/ice if helpful, appliance use if prescribed, and avoiding hard foods',
    workImpact: 'Pain or dental issues affect speaking, eating during work, concentration, and scheduling dental treatment.',
    dailyImpact: 'Meals, talking, sleep, social activities, and hygiene routines are affected.'
  },
  general: {}
};

const BY_ID = {
  'als-lou-gehrig-s-disease': ['neurological', { mainSymptoms: 'progressive weakness, muscle cramping, swallowing or speech changes, breathing issues, fatigue, and loss of function if true', limitation: 'walking, transfers, gripping, speaking, swallowing, breathing endurance, self-care, and work ability', treatment: 'neurology care, medication, therapy, assistive devices, respiratory support if prescribed, and caregiver support', workImpact: 'Progressive weakness and fatigue make regular work unsafe or impossible when tasks require mobility, communication, or sustained effort.', dailyImpact: 'Transfers, bathing, dressing, eating, mobility, and communication may require equipment or help.' }],
  amputations: ['musculoskeletal', { mainSymptoms: 'stump pain, phantom pain, skin irritation, balance problems, prosthetic fit issues, weakness, and fatigue if true', triggers: 'prosthetic use, prolonged standing/walking, skin breakdown, uneven ground, heat, and repeated use', limitation: 'prosthetic tolerance, walking, standing, stairs, balance, lifting, driving, and skin care', treatment: 'prosthetic care, therapy, pain medication, stump/skin care, assistive devices, and follow-up care' }],
  ankle: ['musculoskeletal', { mainSymptoms: 'ankle pain, swelling, stiffness, instability, weakness, reduced motion, and flare-ups', triggers: 'standing, walking, stairs, uneven ground, running, squatting, and repeated use', limitation: 'standing, walking distance, stairs, uneven ground, driving, chores, and exercise', treatment: 'brace/support, physical therapy, medication, ice/heat, stretching, supportive shoes, and rest' }],
  arthritis: ['musculoskeletal', { mainSymptoms: 'joint pain, stiffness, swelling, warmth, weakness, fatigue with repeated use, and reduced motion', triggers: 'repeated use, cold/weather changes, standing, gripping, walking, lifting, and prolonged positions', limitation: 'using affected joints, standing, walking, gripping, lifting, chores, sleep, and work pace' }],
  'back-thoracolumbar-spine': ['musculoskeletal', { mainSymptoms: 'low back pain, stiffness, spasms, reduced bending, weakness, and radiating pain or numbness if true', triggers: 'bending, lifting, sitting, standing, walking, twisting, driving, and repeated use', limitation: 'sitting, standing, walking, bending, lifting, sleep, driving, chores, and work tasks', treatment: 'medication, physical therapy, stretching, heat/ice, brace/support if used, injections if true, and rest' }],
  'bones-and-other-skeletal-conditions': ['musculoskeletal', { mainSymptoms: 'bone or joint pain, tenderness, weakness, instability, deformity, fatigue, and reduced use of the affected area', limitation: 'weight-bearing, lifting, walking, standing, stairs, balance, chores, and work tasks' }],
  'elbow-forearm': ['musculoskeletal', { mainSymptoms: 'elbow or forearm pain, stiffness, weakness, reduced motion, grip pain, numbness/tingling if true, and flare-ups', triggers: 'lifting, gripping, pushing, pulling, typing, tools, repetitive use, and carrying', limitation: 'lifting, carrying, gripping, typing, tools, dressing, cooking, and work tasks' }],
  'foot-conditions-including-flatfoot-pes-planus': ['musculoskeletal', { mainSymptoms: 'foot pain, arch or heel pain, swelling, calluses, tenderness, weakness, altered gait, and fatigue with walking', triggers: 'standing, walking, stairs, uneven ground, hard floors, footwear, and repeated use', limitation: 'standing tolerance, walking distance, stairs, shopping, work shifts, exercise, and chores', treatment: 'orthotics/inserts, supportive shoes, medication, stretching, ice/heat, podiatry care, and rest' }],
  'hand-and-finger': ['musculoskeletal', { mainSymptoms: 'hand or finger pain, stiffness, swelling, weakness, reduced grip, numbness/tingling if true, and reduced dexterity', triggers: 'gripping, typing, writing, tools, lifting, cold, and repetitive use', limitation: 'grip strength, writing, typing, tools, buttons, opening jars, cooking, driving, and work tasks', limitBeforeStopping: '10–20 minutes of repeated hand use' }],
  'hip-and-thigh': ['musculoskeletal', { mainSymptoms: 'hip or thigh pain, stiffness, weakness, reduced motion, altered gait, and flare-ups', triggers: 'walking, standing, stairs, sitting, getting in/out of cars, bending, and repeated use', limitation: 'walking distance, stairs, sitting tolerance, driving, sleep position, chores, and work tasks' }],
  'knee-and-lower-leg': ['musculoskeletal', { mainSymptoms: 'knee/lower leg pain, swelling, stiffness, instability, locking, weakness, reduced motion, and flare-ups', triggers: 'stairs, squatting, kneeling, standing, walking, uneven ground, running, and repeated use', limitation: 'stairs, kneeling, squatting, standing, walking, driving, lifting, chores, and work tasks' }],
  'muscle-injuries': ['musculoskeletal', { mainSymptoms: 'muscle pain, weakness, fatigue, cramping, loss of power, lowered endurance, and movement limits', triggers: 'lifting, carrying, repetitive use, resisted movement, prolonged activity, and overexertion', limitation: 'strength, endurance, lifting, carrying, work pace, chores, and exercise' }],
  'neck-cervical-spine': ['musculoskeletal', { mainSymptoms: 'neck pain, stiffness, spasms, reduced motion, headaches, and radiating arm pain/numbness if true', triggers: 'turning the head, looking down, computer work, driving, lifting, sleeping position, and repeated use', limitation: 'driving, computer work, sleep, lifting, looking over shoulders, chores, and work tasks' }],
  'shoulder-and-or-arm': ['musculoskeletal', { mainSymptoms: 'shoulder/arm pain, stiffness, weakness, reduced motion, clicking, and difficulty reaching overhead', triggers: 'overhead reaching, lifting, carrying, pushing, pulling, dressing, sleeping on that side, and repeated use', limitation: 'overhead work, lifting, carrying, dressing, bathing, driving, sleep, and work tasks' }],
  'temporomandibular-disorders': ['dental', { mainSymptoms: 'jaw pain, clicking or popping, locking, limited opening, headaches, chewing pain, and flare-ups', triggers: 'chewing, talking, yawning, hard foods, clenching, stress, and dental appliances', limitation: 'chewing, speaking, diet choices, sleep, concentration, and social comfort' }],
  wrist: ['musculoskeletal', { mainSymptoms: 'wrist pain, stiffness, weakness, swelling, reduced motion, reduced grip, and numbness/tingling if true', triggers: 'typing, gripping, lifting, pushing, pulling, tools, driving, and repetitive use', limitation: 'typing, gripping, tools, lifting, cooking, driving, dressing, and work tasks', limitBeforeStopping: '10–20 minutes of repeated wrist use' }],
  'headaches-including-migraines': ['headache', {}],
  'mental-disorders': ['mental', {}],
  'ptsd-review': ['mental', { mainSymptoms: 'intrusive memories, nightmares, avoidance, hypervigilance, irritability, panic, poor sleep, concentration problems, and relationship strain if true', triggers: 'trauma reminders, crowded stores, restaurants, traffic, fireworks/loud noises, conflict, anniversaries, or poor sleep', workImpact: 'At work I avoid crowded rooms and unexpected contact, lose focus after intrusive thoughts or poor sleep, get irritable when startled or pressured, and may need to step outside or leave early to prevent escalation.', dailyImpact: 'At home I may sleep separately or wake my partner, avoid stores/restaurants/events, sit with my back to a wall, isolate after conflict, and fall behind on chores or hygiene during bad weeks.' }],
  'non-public-initial-ptsd': ['mental', { mainSymptoms: 'intrusive memories, nightmares, avoidance, hypervigilance, irritability, panic, poor sleep, concentration problems, and relationship strain if true', triggers: 'trauma reminders, crowded stores, restaurants, traffic, fireworks/loud noises, conflict, anniversaries, or poor sleep', workImpact: 'At work I avoid crowded rooms and unexpected contact, lose focus after intrusive thoughts or poor sleep, get irritable when startled or pressured, and may need to step outside or leave early to prevent escalation.', dailyImpact: 'At home I may sleep separately or wake my partner, avoid stores/restaurants/events, sit with my back to a wall, isolate after conflict, and fall behind on chores or hygiene during bad weeks.' }],
  'eating-disorders': ['mental', { mainSymptoms: 'distorted eating patterns, restriction or binge/purge behaviors if true, weight changes, medical complications, anxiety, shame, and social avoidance', triggers: 'stress, body image concerns, trauma reminders, weigh-ins, comments about food/body, or loss of control', limitation: 'meals, health, concentration, social activities, relationships, energy, and work reliability', treatment: 'therapy, nutrition support, medical monitoring, medication if prescribed, safety planning, and support' }],
  'non-public-hearing-loss-and-tinnitus': ['hearing', {}],
  'ear-including-vestibular-and-infectious': ['hearing', { mainSymptoms: 'ear pain, infections, drainage, dizziness/vertigo, balance problems, hearing difficulty, and tinnitus if true', triggers: 'head movement, infections, loud noise, background noise, quick position changes, or pressure changes', limitation: 'balance, driving, walking safely, hearing conversations, phone calls, sleep, and work safety', treatment: 'ENT/audiology care, medication, hearing protection, vestibular therapy if prescribed, hearing aids if prescribed, and avoiding triggers' }],
  'loss-of-sense-of-smell-and-or-taste': ['hearing', { mainSymptoms: 'loss or reduction of smell, loss or reduction of taste, distorted smells/tastes, appetite changes, and safety concerns with smoke/gas/spoiled food', triggers: 'sinus symptoms, infections, irritants, smoke, strong odors, or certain foods', limitation: 'food safety, appetite, cooking, enjoyment of meals, detecting smoke/gas/spoiled food, and quality of life', treatment: 'ENT care, smell training if used, nasal treatment if prescribed, safety precautions, and follow-up care' }],
  'sleep-apnea': ['sleep', {}],
  narcolepsy: ['neurological', { mainSymptoms: 'excessive daytime sleepiness, sleep attacks, cataplexy if true, sleep paralysis, hallucinations around sleep, and poor concentration', triggers: 'monotony, poor sleep, stress, meals, driving, meetings, or sedentary tasks', limitation: 'driving safety, work reliability, concentration, meetings, school/work tasks, and daily scheduling', treatment: 'sleep medicine care, prescribed medication, scheduled naps, sleep hygiene, and safety planning' }],
  'chronic-fatigue-syndrome': ['neurological', { mainSymptoms: 'profound fatigue, post-exertional worsening, unrefreshing sleep, cognitive problems, body aches, headaches, and sore throat/tender nodes if true', frequency: 'Daily', duration: 'all day with crashes lasting one or more days', triggers: 'physical exertion, mental exertion, poor sleep, stress, infections, heat, and over-scheduling', limitation: 'stamina, concentration, chores, exercise, errands, work schedule, and social activities', treatment: 'pacing, rest, sleep hygiene, symptom medication if prescribed, therapy/support, and medical follow-up', flareCare: 'resting, reducing stimulation, hydration, pacing, and avoiding additional exertion' }],
  fibromyalgia: ['neurological', { mainSymptoms: 'widespread pain, tender points, fatigue, poor sleep, stiffness, headaches, brain fog, and sensitivity to touch or temperature if true', frequency: 'Daily', duration: 'constant baseline symptoms with flares lasting hours to days', triggers: 'stress, poor sleep, weather changes, overexertion, repetitive use, and prolonged positions', limitation: 'sleep, concentration, lifting, chores, standing, walking, and work reliability', treatment: 'medication, stretching, gentle exercise if tolerated, heat, pacing, sleep care, and medical follow-up' }],
  'multiple-sclerosis-ms': ['neurological', { mainSymptoms: 'fatigue, weakness, numbness/tingling, balance problems, vision changes, bladder/bowel symptoms, heat sensitivity, and cognitive issues if true', triggers: 'heat, infection, stress, overexertion, poor sleep, and long activity days', limitation: 'walking, balance, heat tolerance, bladder planning, concentration, driving, chores, and work reliability', treatment: 'neurology care, disease-modifying therapy if prescribed, symptom medication, therapy, cooling strategies, and pacing' }],
  'parkinson-s-disease': ['neurological', { mainSymptoms: 'tremor, stiffness, slowed movement, balance problems, gait changes, speech changes, sleep issues, and fatigue if true', triggers: 'medication wearing off, stress, fatigue, complex movements, crowds, and uneven ground', limitation: 'walking, balance, fine motor tasks, dressing, eating, speech, driving, and work pace', treatment: 'neurology care, prescribed medication, therapy, exercise program if advised, assistive devices, and fall prevention' }],
  'peripheral-nerves': ['neurological', { mainSymptoms: 'numbness, tingling, burning pain, weakness, decreased sensation, balance problems, and reduced grip or foot control if true', triggers: 'standing, walking, repetitive use, cold, prolonged positions, and activity', limitation: 'walking, standing, stairs, gripping, fine motor tasks, driving, safety, and sleep', treatment: 'neurology care, medication, braces/supports if used, therapy, foot/skin checks, and medical follow-up' }],
  'diabetic-peripheral-neuropathy': ['neurological', { mainSymptoms: 'burning pain, numbness, tingling, decreased sensation, weakness, balance problems, and foot safety concerns', triggers: 'standing, walking, prolonged positions, blood sugar changes, cold, and activity', limitation: 'walking, standing, balance, sleep, driving, foot care, and work safety', treatment: 'diabetes care, neuropathy medication if prescribed, glucose control, foot care, protective footwear, and medical follow-up' }],
  'cranial-nerve-conditions': ['neurological', { mainSymptoms: 'facial pain or numbness, weakness, eye or mouth symptoms, speech/swallowing issues, taste changes, and sensory changes if true', triggers: 'chewing, talking, cold air, touch, fatigue, stress, or flare-ups', limitation: 'eating, speaking, facial expression, vision/eye comfort, concentration, and work communication' }],
  'central-nervous-system-and-neuromuscular-diseases': ['neurological', {}],
  'seizure-disorders-epilepsy': ['neurological', { mainSymptoms: 'seizure episodes, aura, altered awareness, convulsions if true, confusion afterward, fatigue, injuries, and medication side effects', frequency: '[number] seizures per [week/month/year]', duration: 'minutes for the episode with recovery lasting hours or longer', flareUps: '[number] breakthrough episodes', triggers: 'missed sleep, stress, missed medication, flashing lights if true, illness, alcohol if true, or unknown triggers', limitation: 'driving restrictions, machinery, heights, swimming alone, work safety, and independence', treatment: 'neurology care, anti-seizure medication, trigger avoidance, safety planning, and follow-up testing if true', flareCare: 'seizure safety steps, rest after episodes, medication compliance, avoiding triggers, and emergency care when needed' }],
  'non-public-initial-tbi-residuals': ['tbi', { currentDiagnosis: 'Initial TBI residuals', aliases: 'TBI traumatic brain injury concussion head injury blast injury initial evaluation residuals DC 8045 cognitive impairment', mainSymptoms: 'memory lapses, poor concentration, slowed thinking, headaches, dizziness, light/noise sensitivity, irritability, sleep disruption, balance problems, and fatigue if true', serviceEvent: '[blast exposure, vehicle accident, fall, head strike, concussion, loss/alteration of consciousness, or other in-service head injury]', workImpact: 'At work I need written instructions, repeat reminders, reduced distractions, extra time for multi-step tasks, and breaks from screens/noise; interruptions can cause mistakes or missed steps.', dailyImpact: 'At home I use phone alarms, notes, GPS, calendars, and routines; I may forget appointments, misplace items, lose my place in conversations, avoid night/busy driving, and need quiet rest after headaches or dizziness.' }],
  'non-public-review-tbi-residuals': ['tbi', { currentDiagnosis: 'Review of TBI residuals', aliases: 'TBI traumatic brain injury concussion head injury blast injury review evaluation residuals DC 8045 cognitive impairment worsening', mainSymptoms: 'current memory lapses, poor concentration, slowed thinking, headaches, dizziness, light/noise sensitivity, irritability, sleep disruption, balance problems, and fatigue if true', serviceEvent: '[previously documented TBI/head injury and any worsening, new residuals, or continued symptoms since the last exam]', workImpact: 'Since the last review, I still need written instructions, repeat reminders, reduced distractions, extra time for multi-step tasks, and breaks from screens/noise; interruptions can cause mistakes or missed steps.', dailyImpact: 'Since the last review, I still rely on phone alarms, notes, GPS, calendars, and routines; I may forget appointments, misplace items, lose my place in conversations, avoid night/busy driving, and need quiet rest after headaches or dizziness.' }],
  'heart-conditions': ['cardio', {}],
  hypertension: ['cardio', { mainSymptoms: 'high blood pressure readings, headaches, dizziness, medication side effects, fatigue, or no obvious symptoms despite requiring control', frequency: 'Ongoing and monitored regularly', duration: 'persistent unless controlled by medication', flareUps: 'episodes of elevated readings as they occur', triggers: 'stress, missed medication, pain, caffeine/salt if true, poor sleep, or exertion', limitation: 'medication timing, monitoring, appointments, avoiding triggers, and work/daily planning', treatment: 'prescribed blood pressure medication, home readings if used, lifestyle changes, and medical follow-up' }],
  'artery-and-vein-conditions': ['cardio', { mainSymptoms: 'leg pain with walking, swelling, varicose veins, skin changes, numbness, coldness, fatigue, or circulation problems if true', triggers: 'walking, standing, cold, exertion, prolonged sitting, and end of day swelling', limitation: 'walking distance, standing tolerance, stairs, compression/elevation needs, and work pace', treatment: 'vascular care, medication, compression if prescribed, elevation, procedures if true, and activity modification' }],
  'respiratory-conditions-other-than-tuberculosis-and-sleep-apnea': ['respiratory', {}],
  'sinusitis-rhinitis-and-other-conditions-of-the-nose-throat-larynx-and-pharynx': ['respiratory', { mainSymptoms: 'congestion, drainage, sinus pain/pressure, headaches, sneezing, obstruction, hoarseness, sore throat, or infections if true', frequency: 'Daily or during recurring episodes', duration: 'hours to days, with infections lasting longer', flareUps: 'several episodes per year or per month if true', triggers: 'allergens, dust, smoke, weather changes, infections, strong odors, and poor air quality', limitation: 'sleep, breathing through nose, concentration, headaches, voice use, exercise, and work reliability', treatment: 'nasal sprays, antihistamines, antibiotics/steroids if prescribed, rinses, ENT care, and avoiding triggers' }],
  tuberculosis: ['respiratory', { mainSymptoms: 'cough, shortness of breath, chest symptoms, fatigue, fever/night sweats, weight changes, or residual breathing limits if true', triggers: 'exertion, respiratory infections, smoke, dust, cold air, and fatigue', treatment: 'pulmonary/infectious disease care, medication history, imaging/labs, follow-up monitoring, and avoiding respiratory triggers' }],
  'infectious-diseases-other-than-hiv-related-illness-chronic-fatigue-syndrome-and-tuberculosis': ['respiratory', { mainSymptoms: 'fatigue, fever episodes, pain, weakness, respiratory/GI symptoms, residual organ issues, or recurring infections if true', triggers: 'illness, exertion, stress, heat, poor sleep, or immune flares', limitation: 'stamina, work reliability, appointments, chores, and avoiding exposure to illness' }],
  'persian-gulf-afghanistan-infectious-diseases': ['respiratory', { mainSymptoms: 'fatigue, fever episodes, joint/muscle pain, respiratory symptoms, GI symptoms, headaches, or other residuals if true', triggers: 'exertion, heat, illness, stress, poor sleep, or environmental irritants' }],
  'hiv-related-illnesses': ['general', { mainSymptoms: 'fatigue, infections, weight changes, fevers/night sweats, medication side effects, GI symptoms, or other complications if true', triggers: 'illness, stress, medication side effects, poor sleep, or immune changes', limitation: 'stamina, infection precautions, appointments, medication timing, work reliability, and daily planning', treatment: 'infectious disease care, antiretroviral therapy if prescribed, labs/monitoring, treatment of complications, and medical follow-up' }],
  'stomach-and-duodenum': ['gi', { mainSymptoms: 'stomach pain, nausea, vomiting, reflux-like symptoms, bleeding symptoms if true, appetite changes, and weight changes', triggers: 'meals, spicy/acidic foods, stress, medication, eating late, and flare-ups' }],
  'intestinal-conditions': ['gi', { mainSymptoms: 'diarrhea, constipation, urgency, abdominal pain, cramping, bloating, nausea, bleeding if true, and weight/appetite changes', limitation: 'urgent bathroom access, travel, meals, meetings, long drives, sleep, and work reliability' }],
  'esophageal-disorders': ['gi', { mainSymptoms: 'heartburn/reflux, regurgitation, swallowing trouble, chest discomfort, nausea, vomiting, sleep disruption, or food sticking if true', triggers: 'meals, spicy/acidic foods, lying down, eating late, stress, and certain medications', limitation: 'meals, sleep, bending after eating, concentration, work reliability, and social eating' }],
  gallbladder: ['gi', { mainSymptoms: 'right upper abdominal pain, nausea, vomiting, food intolerance, bloating, diarrhea, or post-surgical residuals if true', triggers: 'fatty foods, large meals, stress, activity, and flare-ups' }],
  liver: ['gi', { mainSymptoms: 'fatigue, abdominal discomfort, nausea, appetite/weight changes, jaundice/itching if true, swelling, and medication restrictions', triggers: 'illness, medication effects, alcohol exposure if applicable, exertion, poor sleep, and diet changes', limitation: 'stamina, appointments/labs, medication restrictions, work reliability, and daily planning', treatment: 'liver specialist/primary care follow-up, labs/imaging, medication management, diet/lifestyle changes, and avoiding liver irritants as directed' }],
  pancreas: ['gi', { mainSymptoms: 'abdominal pain, nausea, vomiting, diarrhea/greasy stools if true, blood sugar issues, appetite/weight changes, and fatigue', triggers: 'meals, fatty foods, alcohol if applicable, stress, and flare-ups' }],
  'rectum-anus': ['gi', { mainSymptoms: 'pain, bleeding, itching, swelling, leakage, urgency, hemorrhoids/fissures if true, and hygiene issues', triggers: 'bowel movements, constipation/diarrhea, sitting, lifting, diet, and flare-ups', limitation: 'sitting, bathroom access, hygiene, work comfort, travel, and daily planning' }],
  'peritoneal-adhesions': ['gi', { mainSymptoms: 'abdominal pain, pulling/tightness, bloating, nausea, bowel changes, and pain with movement if true', triggers: 'movement, bending, lifting, meals, constipation, and flare-ups', limitation: 'bending, lifting, meals, bowel routine, chores, and work tasks' }],
  'hernias-including-abdominal-inguinal-and-femoral-hernias': ['gi', { mainSymptoms: 'bulge, pain, pressure, pulling, weakness, tenderness, and worsening with strain if true', triggers: 'lifting, coughing, straining, standing, bending, and physical work', limitation: 'lifting, carrying, bending, standing, exercise, chores, and work duties', treatment: 'support garments if used, activity limits, medication, surgical evaluation or repair if true, and follow-up care' }],
  'kidney-conditions': ['gu', { mainSymptoms: 'flank pain, urinary changes, swelling, fatigue, infections, abnormal labs, stones, or blood in urine if true', triggers: 'dehydration, infections, activity, stones, medication effects, or flare-ups', limitation: 'hydration planning, bathroom access, stamina, appointments/labs, work reliability, and daily planning' }],
  'urinary-tract-conditions': ['gu', { mainSymptoms: 'urinary frequency, urgency, leakage, nighttime urination, pain/burning, infections, weak stream, or retention if true', triggers: 'fluid intake, caffeine, activity, infections, stress, cold, and flare-ups', limitation: 'bathroom access, sleep, travel, meetings, long drives, work reliability, and social activities' }],
  'male-reproductive-organ-conditions-including-prostate-cancer': ['gu', { mainSymptoms: 'urinary frequency/urgency, leakage, pain, sexual dysfunction, treatment side effects, fatigue, or cancer residuals if true', triggers: 'fluid intake, activity, stress, intimacy, treatment effects, or flare-ups', limitation: 'bathroom access, sleep, intimacy, mood, work reliability, lifting, and daily planning' }],
  'gynecological-conditions': ['gu', { mainSymptoms: 'pelvic pain, heavy or irregular bleeding, cramping, urinary/bowel symptoms, pain with intercourse, infections, or treatment side effects if true', triggers: 'cycle changes, activity, intimacy, stress, prolonged standing, or flare-ups', limitation: 'work attendance, bathroom access, intimacy, exercise, chores, sleep, and daily planning' }],
  breast: ['gu', { mainSymptoms: 'breast/chest wall pain, scars, tenderness, swelling, arm motion limits, lymphedema if true, or treatment residuals', triggers: 'lifting, reaching, pressure/clothing, exercise, treatment effects, and flare-ups', limitation: 'lifting, reaching, clothing comfort, sleep position, intimacy, work tasks, and daily activities' }],
  'skin-diseases': ['skin', {}],
  scars: ['skin', { mainSymptoms: 'scar pain, tenderness, itching, tightness, numbness, instability/skin breakdown, discoloration, and motion limits if true', triggers: 'pressure, friction, clothing, heat/sweat, stretching the area, cold, and touch', limitation: 'clothing, movement, sleep, work gear, shaving/bathing, social comfort, and tasks that rub or stretch the scar' }],
  'non-public-cold-injury-residuals': ['skin', { mainSymptoms: 'cold sensitivity, pain, numbness, tingling, color changes, sweating changes, nail/skin changes, and stiffness if true', triggers: 'cold exposure, damp weather, prolonged standing/walking, and reduced circulation', limitation: 'cold environments, walking/standing, hand/foot use, work outdoors, sleep, and daily comfort', treatment: 'warming strategies, protective clothing, medication if prescribed, skin/foot care, and avoiding cold exposure' }],
  'diabetes-mellitus': ['endocrine', { mainSymptoms: 'blood sugar highs/lows, fatigue, thirst/urination changes, vision changes, neuropathy symptoms if true, and medication effects', triggers: 'missed meals, activity, illness, stress, medication timing, and diet changes', limitation: 'meal planning, medication timing, glucose monitoring, appointments, energy, driving safety during lows, and work reliability', treatment: 'diabetes medication or insulin if prescribed, glucose monitoring, diet changes, exercise as advised, labs, and follow-up care' }],
  'thyroid-and-parathyroid': ['endocrine', { mainSymptoms: 'fatigue, weight change, heat/cold intolerance, palpitations, tremor, mood changes, sleep changes, or weakness if true', triggers: 'hormone level changes, medication timing, stress, heat/cold, and illness' }],
  'endocrine-other-than-thyroid-parathyroid-or-diabetes-mellitus': ['endocrine', {}],
  'nutritional-deficiencies': ['endocrine', { mainSymptoms: 'fatigue, weakness, numbness/tingling, dizziness, cognitive issues, weight/appetite changes, and lab abnormalities if true', triggers: 'diet changes, GI issues, medication effects, illness, exertion, or poor intake', treatment: 'supplements if prescribed, diet changes, lab monitoring, treating underlying causes, and medical follow-up' }],
  'hematologic-and-lymphatic-conditions-including-leukemia': ['general', { mainSymptoms: 'fatigue, weakness, shortness of breath, infections, bruising/bleeding, swelling, pain, or treatment side effects if true', triggers: 'exertion, infections, treatment cycles, anemia, stress, and poor sleep', limitation: 'stamina, infection precautions, appointments/treatment, work reliability, chores, and daily planning', treatment: 'hematology/oncology care, medication, transfusions if true, chemotherapy/radiation if true, labs, and follow-up monitoring' }],
  'systemic-lupus-erythematosus-sle-and-other-autoimmune-diseases': ['neurological', { mainSymptoms: 'joint pain, fatigue, rashes, fevers, swelling, photosensitivity, organ symptoms, brain fog, and flare-ups if true', triggers: 'sun exposure, stress, infections, poor sleep, overexertion, and weather changes', limitation: 'stamina, sun exposure, chores, work reliability, appointments, and daily planning', treatment: 'rheumatology care, immune medication if prescribed, sun protection, symptom medication, labs, and pacing' }],
  osteomyelitis: ['musculoskeletal', { mainSymptoms: 'bone pain, tenderness, swelling, warmth/redness, drainage if true, fever episodes, weakness, and limited use', triggers: 'weight-bearing, pressure, infection flares, activity, and prolonged use', treatment: 'antibiotics if prescribed, wound/bone care, imaging/labs, surgery if true, pain control, and medical follow-up' }],
  'oral-and-dental': ['dental', {}],
  'spina-bifida': ['neurological', { mainSymptoms: 'weakness, numbness, bowel/bladder issues, pain, mobility limits, skin issues, and orthopedic/neurologic complications if true', triggers: 'prolonged walking/standing, pressure, infections, overuse, and equipment fit issues', limitation: 'mobility, bowel/bladder planning, skin care, appointments, work tasks, and daily activities' }],
  'non-public-former-pow-protocol': ['general', { mainSymptoms: 'nutrition problems, joint/muscle pain, nerve symptoms, GI symptoms, mental health symptoms, sleep problems, and residuals from captivity if true', triggers: 'stress, reminders, exertion, cold, hunger/food issues, and medical flare-ups', limitation: 'stamina, sleep, relationships, concentration, digestion, pain, and work reliability' }],
  'non-public-gulf-war-general-medical-examination': ['general', { mainSymptoms: 'fatigue, pain, headaches, respiratory symptoms, GI symptoms, skin symptoms, sleep issues, or unexplained symptoms if true', triggers: 'exertion, heat, dust/fumes, stress, poor sleep, foods, and flare-ups', limitation: 'stamina, work reliability, sleep, chores, exercise, and daily planning' }],
  'non-public-medical-opinion': ['general', { mainSymptoms: 'the symptoms, diagnosis, timeline, and functional limits connected to the medical opinion request', serviceEvent: '[the claimed in-service event/exposure/injury or secondary condition]', limitation: 'the specific disability pattern being evaluated', treatment: 'relevant treatment records, exams, tests, imaging, medications, and specialist opinions', workImpact: 'I want the examiner to understand the medical timeline, continuity of symptoms, treatment, and functional impact accurately.', dailyImpact: 'I will explain only facts I personally know: onset, symptoms, treatment, and how the condition affects daily life.' }],
  'separation-health-assessment-dbq-part-a': ['general', { mainSymptoms: 'the current symptoms I am reporting on the separation health assessment', limitation: 'work, duty, exercise, sleep, and regular daily activities', treatment: 'current or past treatment, medication, profiles/limitations, referrals, and follow-up care' }],
  'guidance-for-separation-health-assessment-dbq-part-a': ['general', { mainSymptoms: 'the current symptoms and medical issues I need documented accurately', limitation: 'work, duty, exercise, sleep, and regular daily activities' }],
  'non-public-separation-health-assessment-part-b': ['general', { mainSymptoms: 'the current symptoms and diagnoses being reviewed during separation', limitation: 'duty limitations, work, exercise, sleep, and daily activities' }],
  'non-public-general-medical-compensation': ['general', { mainSymptoms: 'the symptoms from each claimed condition being evaluated', limitation: 'work reliability, duty tasks, daily activities, sleep, and physical/mental stamina' }],
  'non-public-general-medical-pension': ['general', { mainSymptoms: 'the symptoms from each condition affecting employability and daily function', limitation: 'work capacity, stamina, mobility, concentration, daily activities, and need for assistance' }]
};

const CATEGORY_KIND = [
  [/musculoskeletal/i, 'musculoskeletal'],
  [/psychological|mental/i, 'mental'],
  [/neurological/i, 'neurological'],
  [/cardiovascular/i, 'cardio'],
  [/respiratory|infectious/i, 'respiratory'],
  [/gastrointestinal/i, 'gi'],
  [/genitourinary|gynecological/i, 'gu'],
  [/dermatological|skin/i, 'skin'],
  [/endocrinological|nutrition/i, 'endocrine'],
  [/dental|oral/i, 'dental'],
  [/ear|nose|throat|audiology/i, 'hearing']
];

function classify(item) {
  if (BY_ID[item.id]) return BY_ID[item.id][0];
  const haystack = `${item.id} ${item.title} ${item.category}`;
  if (/headache|migraine/i.test(haystack)) return 'headache';
  if (/ptsd|mental|anxiety|depression|eating/i.test(haystack)) return 'mental';
  if (/hearing|tinnitus/i.test(haystack)) return 'hearing';
  if (/sleep apnea|narcolepsy/i.test(haystack)) return 'respiratory';
  const found = CATEGORY_KIND.find(([pattern]) => pattern.test(haystack));
  return found ? found[1] : 'general';
}

function profileFor(item) {
  const kind = classify(item);
  const idOverride = BY_ID[item.id]?.[1] || {};
  const title = item.title.replace(/ - Research-Derived Non-Public DBQ Substitute$/, '');
  return merge(
    SHARED,
    KIND_DEFAULTS[kind] || KIND_DEFAULTS.general,
    {
      kind,
      id: item.id,
      title,
      currentDiagnosis: title,
      conditionLower: title.toLowerCase(),
      evidence: 'service records, treatment records, VA/private records, medications, imaging/labs/testing, profiles, buddy statements, or lay statements if true'
    },
    idOverride
  );
}

function cleanPrompt(value) {
  return String(value || '')
    .replace(/^\d+[A-Z]?\.\s*/i, '')
    .replace(/^Yes No\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isBoilerplate(value) {
  const lower = value.toLowerCase();
  return (
    value.length < 12 ||
    /^section\s/i.test(value) ||
    lower.includes('there are several separate parameters') ||
    lower.includes('functional loss that can be ascribed') ||
    lower.includes('documented loss of range of motion') ||
    lower.includes('subsequent questions') ||
    lower.includes('initial rom') ||
    lower.includes('active range of motion') ||
    lower.includes('range of motion testing') ||
    lower.includes('unable to test') ||
    lower.includes('complete item') ||
    lower.includes('complete the following') ||
    lower.includes('icd code') ||
    lower.includes('date of diagnosis') ||
    lower.includes('remarks section') ||
    lower.includes('select diagnoses') ||
    lower.includes('list the claimed') ||
    lower.includes('does the veteran') ||
    lower.includes('is the veteran') ||
    lower.includes('was the veteran') ||
    lower.includes('if yes') ||
    lower.includes('if no')
  );
}

function useful(items, limit = 3) {
  const seen = new Set();
  return (items || [])
    .map(cleanPrompt)
    .filter((value) => value && value.length <= 190 && !isBoilerplate(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function cleanArray(items) {
  const seen = new Set();
  return (items || [])
    .map(cleanPrompt)
    .filter((value) => value && !isBoilerplate(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function sanitizeItem(item) {
  for (const key of ['diagnosis', 'history', 'nexus', 'symptoms', 'frequency', 'severity', 'flareUps', 'functionalImpact', 'recommendedInputs']) {
    if (Array.isArray(item[key])) item[key] = cleanArray(item[key]);
  }
  scrubNestedArrays(item);
  return item;
}

function scrubNestedArrays(value) {
  if (!value || typeof value !== 'object') return value;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'script_templates') continue;
    if (Array.isArray(child)) {
      if (child.every((entry) => typeof entry === 'string')) {
        value[key] = cleanArray(child);
      } else {
        child.forEach(scrubNestedArrays);
      }
    } else if (child && typeof child === 'object') {
      scrubNestedArrays(child);
    }
  }
  return value;
}

const DBQ_FALLBACK = {
  musculoskeletal: {
    diagnosis: ['current diagnosis, onset, course, affected joint/body part, treatment history, and whether symptoms are still present'],
    functional: ['painful motion, weakness, fatigability, lack of endurance, instability, repeated use over time, flare-ups, and additional functional loss'],
    treatment: ['medications, physical therapy, braces/supports, imaging, injections/surgery if true, and activity restrictions']
  },
  neurological: {
    diagnosis: ['current neurological diagnosis/residuals, onset, course, testing, treatment, and current symptoms'],
    functional: ['weakness, sensory changes, balance/coordination problems, fatigue, cognitive effects, safety concerns, and work/daily activity limits'],
    treatment: ['neurology care, medications, therapy, assistive devices, testing, and specialist follow-up']
  },
  mental: {
    diagnosis: ['current mental health diagnosis, onset, treatment history, medication/therapy, and symptom course'],
    functional: ['occupational and social impairment, sleep, mood, panic, judgment, thinking, relationships, motivation, memory, and ability to handle stress'],
    treatment: ['therapy, medication, crisis/safety care if true, coping tools, support systems, and mental health follow-up']
  },
  headache: {
    diagnosis: ['headache/migraine diagnosis, onset, frequency, duration, treatment, and current symptom pattern'],
    functional: ['headache frequency, duration, prostrating attacks, nausea, light/sound sensitivity, missed work, and economic impact'],
    treatment: ['abortive/preventive medication, dark-room rest, hydration, sleep, neurology/primary care, and trigger avoidance']
  },
  hearing: {
    diagnosis: ['hearing loss, tinnitus, vestibular, smell/taste, or ear condition diagnosis and testing history'],
    functional: ['communication difficulty, tinnitus effects, balance/dizziness, safety signals, phone/radio use, sleep, and social/work impact'],
    treatment: ['audiology/ENT care, hearing aids if prescribed, hearing protection, vestibular therapy, medication, and testing']
  },
  respiratory: {
    diagnosis: ['current respiratory/sleep/infectious diagnosis, onset, treatment, medication/device use, testing, and current symptoms'],
    functional: ['shortness of breath, cough, wheezing, fatigue, sleep disruption, exertional limits, episodes, treatment use, and work/daily impact'],
    treatment: ['inhalers/medications, CPAP if prescribed, imaging/PFT/sleep testing, specialist care, and trigger avoidance']
  },
  cardio: {
    diagnosis: ['current heart, vascular, or hypertension diagnosis, onset, medications, testing, and current status'],
    functional: ['METs/exertional limits, dyspnea, fatigue, dizziness, chest symptoms, swelling, walking/stairs tolerance, and work impact'],
    treatment: ['cardiology/primary care, prescribed medication, monitoring, testing, procedures, lifestyle changes, and activity guidance']
  },
  gi: {
    diagnosis: ['current gastrointestinal diagnosis, onset, course, treatment, medications, procedures/testing, and current symptoms'],
    functional: ['pain, reflux, nausea/vomiting, bowel changes, urgency, bathroom access, diet restrictions, weight/appetite effects, and work reliability'],
    treatment: ['medication, diet changes, labs/imaging/endoscopy/colonoscopy if true, procedures, hydration, and specialist care']
  },
  gu: {
    diagnosis: ['current genitourinary/reproductive diagnosis, onset, treatment, labs/testing/procedures, and current symptoms'],
    functional: ['urinary frequency/urgency/leakage, infections, pain, sleep disruption, bathroom access, intimacy, and work/daily planning'],
    treatment: ['medication, pads/devices if used, procedures, labs/imaging, specialist care, and follow-up']
  },
  skin: {
    diagnosis: ['current skin/scar diagnosis, onset, affected areas, treatment, medication, and current symptoms'],
    functional: ['pain, itching, instability, skin breakdown, exposed/total body area, disfigurement, clothing limits, sleep, and work impact'],
    treatment: ['topical/oral medication, dressings, procedures, dermatology care, scar care, and trigger avoidance']
  },
  endocrine: {
    diagnosis: ['current endocrine/nutritional diagnosis, onset, treatment, medication, monitoring/labs, and current symptoms'],
    functional: ['fatigue, weakness, weight/appetite changes, monitoring needs, medication timing, diet restrictions, complications, and work/daily impact'],
    treatment: ['medication, monitoring/labs, diet changes, specialist care, supplements if prescribed, and follow-up']
  },
  dental: {
    diagnosis: ['current oral/dental/TMJ diagnosis, onset, dental treatment, appliances/procedures, and current symptoms'],
    functional: ['chewing, speaking, jaw motion, pain, diet restrictions, tooth loss, mouth opening, and work/social impact'],
    treatment: ['dental care, appliances/mouth guard if prescribed, medication, soft diet, procedures, and follow-up']
  },
  general: {
    diagnosis: ['current diagnosis or claimed condition, onset, course, treatment history, medications, testing, and current symptoms'],
    functional: ['frequency, duration, severity, flare-ups, treatment, work impact, and daily activity limits'],
    treatment: ['treatment records, medications, tests, imaging/labs, specialist care, therapy, devices, and supporting evidence']
  }
};

function wording(item, profile, section) {
  const pools = {
    diagnosis: [...(item.diagnosis || []), ...(item.history || [])],
    nexus: [...(item.nexus || [])],
    functional: [...(item.functionalImpact || []), ...(item.symptoms || []), ...(item.severity || []), ...(item.frequency || [])],
    treatment: [...(item.history || []), ...(item.recommendedInputs || [])]
  };
  const extracted = useful(pools[section], section === 'functional' ? 4 : 3);
  if (extracted.length) return extracted.join('; ');
  if (section === 'nexus') return 'in-service event, injury, illness, hazardous exposure, aggravation, or secondary service connection timeline';
  return (DBQ_FALLBACK[profile.kind] || DBQ_FALLBACK.general)[section].join('; ');
}

function section(id, number, title, intent, dbq, say, example, profile, extra = {}) {
  return {
    id,
    number,
    title,
    formula_category: `Categories.md major category ${number}`,
    intent,
    dbq_wording_to_hit: dbq,
    what_to_say_template: say,
    personalized_example_template: example,
    blank_fields: COMMON_FIELDS,
    default_options: defaults(profile),
    ...extra
  };
}

function bulletsFor(profile, sectionId) {
  const sharedMedical = [
    'Onset: {{onset}}',
    'Service event / exposure / aggravation: {{serviceEvent}}',
    'Treatment tried: {{treatment}}',
    'Records to mention if true: {{evidence}}'
  ];

  const byKind = {
    mental: {
      symptom_evaluation: [
        'Sleep: nightmares, waking in sweat/panic, broken sleep, or only [__] hours if true',
        'Anxiety/panic: crowds, stores, traffic, work meetings, loud noises, or reminders',
        'Mood/behavior: irritability, anger outbursts, isolation, depression, low motivation, or guilt',
        'Memory/focus: forgetting tasks, rereading instructions, losing track in conversations'
      ],
      functional_impact: [
        'Work: leaving meetings, avoiding coworkers/customers, needing breaks, mistakes, missed days',
        'Home: sleeping separately, avoiding family events, neglecting chores/hygiene, isolating in a room',
        'Public places: grocery stores, restaurants, crowds, fireworks, traffic, or sitting with back to a wall',
        'Worst days: panic, anger, shutdown, no sleep, not leaving home, or needing support to calm down'
      ]
    },
    tbi: {
      medical_history: [
        'TBI event: blast, fall, head strike, vehicle accident, concussion, loss/altered consciousness, or memory gap',
        'Immediate symptoms: confusion, dazed feeling, headache, dizziness, nausea, vomiting, ringing ears, vision changes, or amnesia',
        'Testing/treatment: CT/MRI, neuropsych testing, neurology/TBI clinic, vestibular/vision therapy, headache treatment',
        'Timeline: what changed since the injury or since the last TBI review exam'
      ],
      symptom_evaluation: [
        'Cognitive facets: memory, attention, concentration, executive function, judgment, orientation',
        'Daily examples: forget appointments, repeat questions, lose items, miss steps, rely on notes/alarms/GPS',
        'Subjective residuals: headaches, dizziness/vertigo, tinnitus, light/noise sensitivity, sleep disruption, fatigue',
        'Neurobehavioral/communication: irritability, impulsivity, social withdrawal, word-finding, trouble following conversations'
      ],
      functional_impact: [
        'Work: written instructions, repeated reminders, extra time, reduced distractions, screen/noise breaks, missed steps/mistakes',
        'Driving/safety: dizziness, getting lost, slow reaction, avoiding night/busy traffic, needing GPS even on familiar routes',
        'Home/IADLs: bills, meds, appointments, cooking steps, chores, conversations, childcare, errands',
        'Worst days: headache/brain fog/dizziness forces dark quiet room, no driving, no screens, help from family/coworker'
      ]
    },
    musculoskeletal: {
      symptom_evaluation: [
        'Pain scale: best day {{bestPain}}, worst day {{worstPain}}',
        'Motion/use: pain with bending, lifting, stairs, squatting, gripping, reaching, or walking if true',
        'Repeated use: worse after {{limitBeforeStopping}} of activity',
        'Signs to mention: swelling, locking, instability, weakness, stiffness, spasms, numbness, or altered gait if true'
      ],
      functional_impact: [
        'Work tasks: lifting, carrying, standing, walking, typing/tools, kneeling, stairs, or overhead work',
        'Daily tasks: dressing, bathing, cooking, cleaning, shopping, driving, yard work, or sleep position',
        'Limits: can stand/walk/sit/use joint about {{limitBeforeStopping}} before stopping',
        'Flare care: {{flareCare}}'
      ]
    },
    headache: {
      symptom_evaluation: [
        'Attack count: {{frequency}}; severe/prostrating attacks: {{flareUps}}',
        'Duration: {{duration}}',
        'Associated symptoms: nausea, vomiting, light sensitivity, sound sensitivity, vision changes if true',
        'Rescue behavior: dark quiet room, lie down, medication, sleep, avoid screens/driving'
      ],
      functional_impact: [
        'Work: missed shifts, leaving early, no screens, no driving, reduced productivity',
        'Home: cancelled plans, dark room, help with kids/chores, no cooking/driving during attacks',
        'Economic impact: missed work, accommodations, reduced hours, or write-ups if true',
        'Worst attack: pain {{worstPain}}, lasts {{duration}}, cannot continue normal activity'
      ]
    },
    sleep: {
      symptom_evaluation: [
        'Night symptoms: snoring, witnessed pauses, choking/gasping, mask problems, morning headaches if true',
        'Next-day symptoms: sleepiness, fatigue, brain fog, irritability, unsafe drowsy driving',
        'Treatment: CPAP/BiPAP/oral appliance use, mask fit, residual symptoms despite treatment',
        'Frequency: {{frequency}}; bad nights: {{flareUps}}'
      ],
      functional_impact: [
        'Work: late starts, concentration problems, mistakes, needing naps/breaks, safety-sensitive limits',
        'Driving: pulling over, avoiding long drives, caffeine/rest planning if true',
        'Home: naps, low energy, irritability, missed chores, falling asleep during TV/reading',
        'Worst day: severe sleepiness or fatigue after poor sleep'
      ]
    },
    respiratory: {
      symptom_evaluation: [
        'Breathing: shortness of breath, wheezing, cough, chest tightness, congestion, fatigue if true',
        'Triggers: exertion, stairs, dust/smoke/fumes, cold air, allergens, humidity, infections',
        'Episodes: {{frequency}}, lasting {{duration}}',
        'Treatment: inhalers, nasal sprays, antibiotics/steroids, CPAP, oxygen, or avoidance if true'
      ],
      functional_impact: [
        'Activities: stairs, walking distance, yard work, exercise, talking while walking, sleep',
        'Work locations: dust, fumes, smoke, heat/cold, masks/respirators, physical tasks',
        'Pacing: stop after {{limitBeforeStopping}} or after stairs/walking if true',
        'Worst days: rescue medication, rest, missed work, urgent care, or staying inside if true'
      ]
    },
    gi: {
      symptom_evaluation: [
        'GI symptoms: abdominal pain, urgency, diarrhea/constipation, nausea/vomiting, reflux, bloating if true',
        'Bathroom frequency: [__] times/day or urgent episodes [__] times/week if true',
        'Food triggers: fatty/spicy foods, dairy/gluten, large meals, late meals, stress, medication',
        'Duration: {{duration}}; flares: {{flareUps}}'
      ],
      functional_impact: [
        'Work: bathroom access, leaving meetings, missing time, meal planning, long-drive limits',
        'Daily life: errands planned around bathrooms, avoiding restaurants, cancelled plans, sleep disruption',
        'Travel: need aisle seat/stops, avoid long drives, map bathrooms if true',
        'Worst days: stay near bathroom, bland diet, hydration, medication, rest'
      ]
    },
    gu: {
      symptom_evaluation: [
        'Voiding: frequency, urgency, leakage, pads/absorbent changes, nighttime urination if true',
        'Pain/infection: burning, pelvic/flank pain, recurrent UTIs, stones, blood in urine if true',
        'Timing: daytime interval [__], nighttime waking [__] times if true',
        'Treatment: medication, pads/devices, labs, procedures, specialist care'
      ],
      functional_impact: [
        'Work: bathroom breaks, meetings interrupted, travel planning, sleep loss affecting reliability',
        'Daily life: errands, intimacy, exercise, long drives, social activities planned around symptoms',
        'Supplies/devices: pads, extra clothes, bathroom mapping, hydration planning if true',
        'Worst days: stay near bathroom, reduce activity, seek care for infection/pain'
      ]
    },
    cardio: {
      symptom_evaluation: [
        'Symptoms: breathlessness, fatigue, dizziness, chest discomfort, palpitations, swelling if true',
        'Activity examples: stairs, walking distance, carrying groceries, yard work, heat exposure',
        'Blood pressure/readings or METs examples if known: [__]',
        'Medication/monitoring: {{treatment}}'
      ],
      functional_impact: [
        'Work: avoid heavy lifting/exertion, extra breaks, heat/stress limits, safety concerns',
        'Daily life: stairs, shopping, chores, exercise, long days, driving when dizzy',
        'Pacing: stop after {{limitBeforeStopping}} or when symptoms start',
        'Worst days: rest, monitor, use prescribed meds, seek care for dangerous symptoms'
      ]
    },
    skin: {
      symptom_evaluation: [
        'Skin/scar symptoms: pain, itching, burning, rash, drainage, breakdown, tenderness, numbness if true',
        'Area: location, size, exposed area, number of scars/lesions, painful or unstable if true',
        'Triggers: heat, sweat, friction, clothing/uniform, shaving, sun, chemicals',
        'Treatment: topical/oral meds, dressings, procedures, systemic therapy if true'
      ],
      functional_impact: [
        'Work: uniforms/gear, heat/sweat, gloves/boots, chemicals, appearance/social comfort',
        'Daily life: sleep, clothing, bathing, shaving, exercise, intimacy, movement',
        'Worst days: cover area, avoid friction/heat, change dressings, rest if painful',
        'Safety/hygiene: skin breakdown, infection concern, frequent cleaning if true'
      ]
    }
  };

  const general = {
    medical_history: sharedMedical,
    symptom_evaluation: [
      'Frequency: {{frequency}}',
      'Duration: {{duration}}',
      'Severity: best {{bestPain}}, worst {{worstPain}}',
      'Triggers / locations / activities: {{triggers}}'
    ],
    functional_impact: [
      'Work impact: {{workImpact}}',
      'Daily impact: {{dailyImpact}}',
      'Limit before stopping: {{limitBeforeStopping}}',
      'Worst days / flare-ups: {{flareUps}}; care used: {{flareCare}}'
    ]
  };

  return byKind[profile.kind]?.[sectionId] || general[sectionId] || [];
}

function functionalSayTemplate(profile, examples) {
  const byKind = {
    mental: `For work: {{workImpact}}\n\nFor daily life: {{dailyImpact}}\n\nAverage day: Symptoms are usually around {{bestPain}}, but in stressful settings they can build within {{limitBeforeStopping}} and I may need to leave, isolate, use coping tools, or get support.\n\nWorst days: My worst days happen {{flareUps}}; during them, ${examples.flare}`,
    sleep: `For work: {{workImpact}}\n\nFor daily life: {{dailyImpact}}\n\nAverage day: Fatigue or sleepiness is usually around {{bestPain}}, with worse alertness after poor sleep.\n\nWorst days: Bad nights happen {{flareUps}}. The next day I may have severe fatigue, brain fog, irritability, or unsafe drowsiness. When that happens, I {{flareCare}}.`,
    tbi: `For work: {{workImpact}}\n\nFor daily life: {{dailyImpact}}\n\nAverage day: Brain fog, headache, dizziness, or concentration problems are usually around {{bestPain}}. Symptoms are worse with {{triggers}}. After about {{limitBeforeStopping}}, I may need to stop, reduce stimulation, use reminders, or get help.\n\nWorst days: My worst days happen {{flareUps}}; during them, ${examples.flare}`,
    hearing: `For work: {{workImpact}}\n\nFor daily life: {{dailyImpact}}\n\nAverage day: Symptoms are {{bestPain}} on a typical day, but they become worse with {{triggers}}. In noisy or communication-heavy settings, one conversation or meeting can be enough to cause missed information, safety concerns, or needing written follow-up.\n\nWorst days: During worse episodes, ${examples.flare}`,
    headache: `For work: {{workImpact}}\n\nFor daily life: {{dailyImpact}}\n\nAverage day: Headache symptoms are around {{bestPain}} when present.\n\nWorst days: Severe attacks happen {{flareUps}} and usually last {{duration}}. During an attack, ${examples.flare}`,
    gi: `For work: {{workImpact}}\n\nFor daily life: {{dailyImpact}}\n\nAverage day: Symptoms are around {{bestPain}} when active and are worse with {{triggers}}.\n\nWorst days: Flares happen {{flareUps}} and can last {{duration}}. During a flare, ${examples.flare}`,
    gu: `For work: {{workImpact}}\n\nFor daily life: {{dailyImpact}}\n\nAverage day: Symptoms are around {{bestPain}} when active and are worse with {{triggers}}.\n\nWorst days: Flares or urgent episodes happen {{flareUps}} and can affect me {{duration}}. During them, ${examples.flare}`,
    cardio: `For work: {{workImpact}}\n\nFor daily life: {{dailyImpact}}\n\nAverage day: Symptoms are around {{bestPain}} with activity or monitoring issues and are worse with {{triggers}}.\n\nWorst days: I have to stop or slow down around {{limitBeforeStopping}} or when symptoms start; during bad episodes, ${examples.flare}`,
    respiratory: `For work: {{workImpact}}\n\nFor daily life: {{dailyImpact}}\n\nAverage day: Symptoms are around {{bestPain}} when active and are worse with {{triggers}}.\n\nWorst days: I have to stop or slow down around {{limitBeforeStopping}} or when breathing symptoms build; during bad episodes, ${examples.flare}`
  };

  return byKind[profile.kind] || `For work: {{workImpact}}\n\nFor daily life: {{dailyImpact}}\n\nAverage day: Symptoms are usually around {{bestPain}} and I can continue for about {{limitBeforeStopping}} before I need to stop, rest, modify the task, or get help.\n\nWorst days: My worst days or flare-ups happen {{flareUps}}; during them, ${examples.flare}`;
}

function defaults(profile) {
  const { kind, title, conditionLower, evidence, ...rest } = profile;
  const selected = {};
  for (const key of COMMON_FIELDS) selected[key] = rest[key] || SHARED[key] || '';
  selected.mainSymptoms = rest.mainSymptoms || 'symptoms that are true for me';
  selected.evidence = evidence;
  selected.aliases = rest.aliases || '';
  return selected;
}

function makeTemplate(item) {
  const profile = profileFor(item);
  const diagnosisDbq = wording(item, profile, 'diagnosis');
  const nexusDbq = wording(item, profile, 'nexus');
  const functionalDbq = wording(item, profile, 'functional');
  const treatmentDbq = wording(item, profile, 'treatment');
  const condition = profile.title;

  const symptomSubsections = [
    {
      id: 'frequency_duration',
      title: 'Frequency & Duration',
      dbq_wording_to_hit: 'Document frequency, duration, pattern, triggers, and whether symptoms are constant, intermittent, recurrent, or episodic.',
      what_to_say_template: 'My {{currentDiagnosis}} symptoms are {{frequency}}. They usually last {{duration}}. The symptoms I need documented are {{mainSymptoms}}. They get worse with {{triggers}}.',
      example_template: 'For example, {{conditionExampleFrequency}}'
    },
    {
      id: 'severity_scale',
      title: 'Severity Scale',
      dbq_wording_to_hit: 'Describe severity using measurable words, worst-day impairment, and any DBQ-specific severe-episode language that truthfully applies.',
      what_to_say_template: 'On better days, severity is about {{bestPain}}. On worst days, it reaches {{worstPain}}. Overall, I would describe it as {{severity}} because it interferes with {{limitation}}.',
      example_template: 'On a bad day, symptoms reach {{worstPain}} and I have to stop or reduce {{limitation}} instead of pushing through.'
    }
  ];

  const functionalSubsections = [
    {
      id: 'work_daily_life',
      title: 'Daily Activities',
      dbq_wording_to_hit: 'Explain work limitations, daily activity limits, missed time, accommodations, safety concerns, and reduced reliability/productivity.',
      what_to_say_template: 'This affects work because {{workImpact}} It affects daily life because {{dailyImpact}} I can usually continue for about {{limitBeforeStopping}} before I need to stop, rest, modify the task, or get help.',
      example_template: 'A real-life example is: {{conditionExampleWork}}'
    },
    {
      id: 'flare_ups',
      title: 'Flare-Ups / Worst Days',
      dbq_wording_to_hit: 'Describe flare-up frequency, triggers, duration, worst-day functional loss, and what helps relieve symptoms.',
      what_to_say_template: 'Flare-ups or worst episodes happen {{flareUps}}. They are triggered by {{triggers}} and can last {{duration}}. During them, I cannot keep up with {{limitation}}, and I use {{flareCare}}.',
      example_template: 'During a flare-up, {{conditionExampleFlare}}'
    }
  ];

  const examples = conditionExamples(profile);
  for (const sub of [...symptomSubsections, ...functionalSubsections]) {
    sub.example_template = sub.example_template
      .replace('{{conditionExampleFrequency}}', examples.frequency)
      .replace('{{conditionExampleWork}}', examples.work)
      .replace('{{conditionExampleFlare}}', examples.flare);
  }

  return {
    schema_version: '3.0',
    formula_source: 'Categories.md',
    truthfulness_guardrail: GUARDRAIL,
    claim_kind: profile.kind,
    default_options: defaults(profile),
    sections: [
      section(
        'medical_history',
        1,
        'Medical History / Onset & Nexus',
        'Answer when/where symptoms started, what service event/exposure/aggravation may connect them, and what treatment has been tried.',
        `${diagnosisDbq}; ${nexusDbq}; ${treatmentDbq}`,
        'My claimed condition is {{currentDiagnosis}}. It first started or became noticeable {{onset}} after {{serviceEvent}}. Since then, the condition has continued with {{mainSymptoms}}. I have tried {{treatment}}, but symptoms still happen {{frequency}}. Evidence that may support the timeline includes {{evidence}}.',
        '',
        profile,
        { bullet_templates: bulletsFor(profile, 'medical_history') }
      ),
      section(
        'symptom_evaluation',
        2,
        'Symptom Evaluation',
        'Answer DBQ-style symptom questions with exact frequency, duration, severity, triggers, and condition-specific symptoms.',
        functionalDbq,
        `My symptoms are {{mainSymptoms}}. They happen {{frequency}}, usually last {{duration}}, and are triggered or worsened by {{triggers}}. On better days they are about {{bestPain}}; on worst days they reach {{worstPain}}. For example, ${examples.frequency}`,
        '',
        profile,
        { subsections: symptomSubsections, bullet_templates: bulletsFor(profile, 'symptom_evaluation') }
      ),
      section(
        'functional_impact',
        3,
        'Functional Impact / Occupational Assessment',
        'Answer how the disability limits work, daily activities, relationships/social function, reliability, and worst-day functioning.',
        functionalDbq,
        functionalSayTemplate(profile, examples),
        '',
        profile,
        { subsections: functionalSubsections, bullet_templates: bulletsFor(profile, 'functional_impact') }
      )
    ]
  };
}

function conditionExamples(profile) {
  const examplesByKind = {
    musculoskeletal: {
      frequency: 'my pain is present daily, gets worse after about {{limitBeforeStopping}} of use, and is aggravated by {{triggers}}.',
      work: 'after about {{limitBeforeStopping}} of {{limitation}}, pain and stiffness build and I need to sit, stand, stretch, brace, ice/heat, or stop the task.',
      flare: 'pain reaches {{worstPain}}, motion and strength drop, I avoid {{limitation}}, and I use {{flareCare}} until it settles.',
      summary: 'after about {{limitBeforeStopping}} of activity, pain, stiffness, or weakness increases enough that I need breaks, modified movement, or help with {{limitation}}.'
    },
    neurological: {
      frequency: 'symptoms occur {{frequency}}, often worsen with {{triggers}}, and can affect safety or task completion for {{duration}}.',
      work: 'when symptoms build, I slow down, make more mistakes, avoid unsafe tasks, and need breaks or support with {{limitation}}.',
      flare: 'weakness, sensory changes, fatigue, or balance/cognitive symptoms worsen, and I need {{flareCare}} before I can resume normal activity.',
      summary: 'symptoms interfere with {{limitation}}, especially after {{triggers}}, and I need pacing or assistance to avoid mistakes or safety problems.'
    },
    mental: {
      frequency: 'symptoms happen {{frequency}}, with worse episodes after {{triggers}}, and sleep problems can affect the next day.',
      work: 'poor sleep, anxiety, irritability, low motivation, or concentration problems make me less reliable and I may need isolation, breaks, or schedule changes.',
      flare: 'symptoms spike to {{worstPain}}, I avoid people or situations, may leave the room/store/work area, and I {{flareCare}} to calm down and prevent things from getting worse.',
      summary: 'symptoms affect sleep, focus, mood, relationships, and reliability; for example, stressful settings can overwhelm me within {{limitBeforeStopping}}.'
    },
    tbi: {
      frequency: 'memory, focus, headache, dizziness, or brain-fog symptoms happen {{frequency}}, worsen with {{triggers}}, and can last {{duration}}.',
      work: 'I need written instructions, reminders, fewer distractions, extra time, and breaks from screens/noise because interruptions or multitasking can cause missed steps and mistakes.',
      flare: 'headache, dizziness, light/noise sensitivity, or brain fog worsens to {{worstPain}}, I stop screens/driving, rest in a quiet place, use notes/reminders, and may need help with tasks or transportation.',
      summary: 'after {{limitBeforeStopping}}, symptoms can interfere with memory, focus, reading/screens, driving, balance, and task completion.'
    },
    headache: {
      frequency: 'headaches happen {{frequency}}, severe attacks happen {{flareUps}}, and the worst ones last {{duration}}.',
      work: 'during severe attacks, I cannot use screens, handle light/noise, drive safely, or stay productive, and I may need to lie down or miss work.',
      flare: 'head pain reaches {{worstPain}}, light/noise or nausea may be present if true, and I need {{flareCare}} until the attack passes.',
      summary: 'when a severe headache starts, within {{limitBeforeStopping}} I often need to stop activity, avoid light/noise, take medication, and lie down if true.'
    },
    hearing: {
      frequency: 'communication or tinnitus symptoms are {{frequency}} and become worse with {{triggers}}.',
      work: 'I miss instructions, struggle in meetings or phone calls, ask for repetition, and worry about alarms or safety signals.',
      flare: 'tinnitus, hearing difficulty, dizziness, or ear symptoms become severe enough that I {{flareCare}} and avoid communication-heavy or unsafe settings.',
      summary: 'background noise or quiet rooms can quickly make symptoms interfere with conversations, sleep, safety awareness, or work communication.'
    },
    sleep: {
      frequency: 'sleep apnea symptoms happen {{frequency}}, and the next-day effects can last {{duration}}.',
      work: 'fatigue and daytime sleepiness make it harder to concentrate, stay awake, drive safely, and remain reliable through the workday.',
      flare: 'after a bad night, fatigue or sleepiness becomes severe enough that I {{flareCare}}.',
      summary: 'bad sleep carries into the next day, affecting alertness, concentration, mood, driving safety, and work reliability.'
    },
    respiratory: {
      frequency: 'breathing or sleep-related symptoms happen {{frequency}}, worsen with {{triggers}}, and can last {{duration}}.',
      work: 'stairs, walking, dust/fumes, poor sleep, or exertion force me to slow down, take breaks, or avoid certain tasks.',
      flare: 'shortness of breath, cough, fatigue, sleep disruption, or congestion worsens and I {{flareCare}} before I can resume activity.',
      summary: 'exertion or poor sleep affects alertness, stamina, and pace, so I plan around triggers and take breaks when symptoms build.'
    },
    cardio: {
      frequency: 'symptoms or monitoring issues are {{frequency}}, especially with {{triggers}}, and episodes last {{duration}}.',
      work: 'I have to limit exertion, avoid heavy tasks, monitor symptoms, and take breaks when stairs, lifting, stress, or heat make symptoms worse.',
      flare: 'symptoms become concerning enough that I stop activity, rest, monitor as directed, use prescribed treatment, and seek care for dangerous symptoms.',
      summary: 'exertion limits how long I can walk, climb stairs, lift, or work at pace before symptoms require rest or modification.'
    },
    gi: {
      frequency: 'GI symptoms happen {{frequency}}, can last {{duration}}, and often require bathroom access or diet changes.',
      work: 'I need urgent bathroom access, food planning, breaks, and may leave or miss work when pain, nausea, reflux, or bowel symptoms flare.',
      flare: 'pain, urgency, nausea, reflux, bowel changes, or appetite symptoms worsen, so I {{flareCare}} until it passes.',
      summary: 'meals, bathroom access, travel, meetings, and long drives have to be planned around symptoms and flare-ups.'
    },
    gu: {
      frequency: 'urinary, kidney, reproductive, or pelvic symptoms happen {{frequency}} and can affect me throughout the day or night.',
      work: 'I plan around bathroom access, sleep disruption, pain, appointments, or treatment needs and may need breaks or schedule changes.',
      flare: 'symptoms worsen enough that I stay near a bathroom, reduce activity or intimacy, rest, use treatment, or seek care if infection/worsening occurs.',
      summary: 'bathroom access, sleep, intimacy, travel, and work planning are affected, especially during flares or treatment periods.'
    },
    skin: {
      frequency: 'skin or scar symptoms are {{frequency}}, with flares lasting {{duration}} and worsening after {{triggers}}.',
      work: 'clothing, heat, friction, uniforms, chemicals, or movement can irritate the area and force me to modify tasks or take breaks.',
      flare: 'itching, pain, burning, skin breakdown, or sensitivity worsens, so I {{flareCare}} while avoiding friction or triggers.',
      summary: 'during flares, clothing, sleep, movement, hygiene, and work gear can aggravate symptoms and limit daily activities.'
    },
    endocrine: {
      frequency: 'symptoms or monitoring needs are {{frequency}} and can last {{duration}} when levels, meals, medication timing, or stress are off.',
      work: 'fatigue, monitoring, medication timing, meals, appointments, or complications require planning and can reduce pace or reliability.',
      flare: 'fatigue, weakness, blood sugar/hormone symptoms, or medication side effects worsen and I use {{flareCare}}.',
      summary: 'I have to plan meals, medications, monitoring, appointments, and activity around symptoms so I can function safely.'
    },
    dental: {
      frequency: 'oral, dental, or jaw symptoms happen {{frequency}} and worsen with {{triggers}}.',
      work: 'pain affects speaking, eating, concentration, and communication, especially after chewing or talking for {{limitBeforeStopping}}.',
      flare: 'jaw/mouth pain or chewing/speaking limits worsen and I switch to {{flareCare}} until symptoms calm down.',
      summary: 'chewing, speaking, diet choices, sleep, and communication become limited when symptoms flare.'
    },
    general: {
      frequency: 'symptoms happen {{frequency}}, last {{duration}}, and worsen with {{triggers}}.',
      work: 'symptoms affect reliability, pace, attendance, safety, or task completion, and I need breaks or modifications.',
      flare: 'symptoms worsen to {{worstPain}}, I reduce activity, use {{flareCare}}, and may need help or time to recover.',
      summary: 'symptoms affect {{limitation}}, especially during flare-ups or after {{triggers}}.'
    }
  };
  return examplesByKind[profile.kind] || examplesByKind.general;
}

function toCatalogRecord(item) {
  const scriptTemplates = item.script_templates;
  const { script_templates, ...rest } = item;
  const source = rest.source || {};
  const documentType = rest.documentType || rest.document_type || 'Public VA DBQ';
  const sourceUrl = rest.sourceUrl || source.pdf_url || source.inventory_page || source.source_urls?.[0] || '';
  const localPdf = rest.localPdf || rest.local_pdf || source.local_pdf || '';
  const updatedOn = rest.updatedOn || rest.updated_on || source.updated_on || '';
  const verifiedOn = rest.verifiedOn || rest.verified_on || source.verified_on || '';
  const version = rest.version || source.version || '';
  const searchText = [
    rest.title,
    rest.category,
    documentType,
    rest.availability,
    rest.purpose,
    ...(rest.diagnosis || []),
    ...(rest.history || []),
    ...(rest.nexus || []),
    ...(rest.symptoms || []),
    ...(rest.frequency || []),
    ...(rest.severity || []),
    ...(rest.flareUps || []),
    ...(rest.functionalImpact || []),
    ...(rest.recommendedInputs || []),
    scriptTemplates?.claim_kind,
    scriptTemplates?.default_options?.aliases,
    ...(Object.values(scriptTemplates?.default_options || {}))
  ].filter(Boolean).join(' ').toLowerCase();

  return {
    ...rest,
    documentType,
    sourceUrl,
    localPdf,
    updatedOn,
    verifiedOn,
    version,
    scriptTemplates,
    guardrail: rest.guardrail || GUARDRAIL,
    searchText
  };
}

const updated = [];
for (const file of JSON_FILES) {
  const fullPath = path.join(DATA_DIR, file);
  const item = sanitizeItem(JSON.parse(fs.readFileSync(fullPath, 'utf8')));
  item.script_templates = makeTemplate(item);
  fs.writeFileSync(fullPath, `${JSON.stringify(item, null, 2)}\n`);
  updated.push(item);
}

const inventoryPath = path.join(DATA_DIR, '_inventory.json');
if (fs.existsSync(inventoryPath)) {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  inventory.generatedOn = new Date().toISOString().slice(0, 10);
  inventory.totalRecords = updated.length;
  inventory.scriptTemplateSchemaVersion = '3.0';
  fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
}

const catalog = updated.map(toCatalogRecord).sort((a, b) => a.title.localeCompare(b.title));
fs.writeFileSync(CATALOG_PATH, `window.DBQ_CATALOG = ${JSON.stringify(catalog)};\n`);

console.log(`Updated ${updated.length} DBQ JSON files and regenerated data/dbq-catalog.js`);
