// The 12-week home gym programme, taken from "Home Gym Programme.docx".

export const START = '2026-11-16'; // Monday, week 1
export const WEEKS = 12;
export const ORDER = ['A', 'B', 'C'];
export const REVIEW_DATES = ['2026-12-11', '2027-02-05'];

// inc: kg to add when every set reaches the top of the rep range.
// 'plate' means a cable stack: add one plate or the micro plate.
export const SESSIONS = {
  A: {
    name: 'Session A',
    day: 'Monday',
    dow: 1,
    when: '5:30am, before work',
    focus: 'Squat, press, row',
    exercises: [
      { id: 'squat', tag: '1', name: 'Back squat', kit: 'Olympic bar', sets: 3, lo: 6, hi: 8, rest: 120, inc: 5,
        setup: 'Half rack. J-hooks at mid-chest, spotter arms just below your bottom position.' },
      { id: 'bench', tag: '2a', name: 'Bench press', kit: 'Olympic bar', sets: 3, lo: 6, hi: 10, rest: 0, next: '2b', inc: 2.5,
        setup: 'Spotter arms a touch under chest height. Use the Smith bar instead on a rushed morning.' },
      { id: 'lowrow', tag: '2b', name: 'Seated low row', kit: 'Cable', sets: 3, lo: 8, hi: 12, rest: 75, inc: 'plate',
        setup: 'Low row station with the footplate. Pause with the handle at your ribs.' },
      { id: 'facepull', tag: '3', name: 'Face pull', kit: 'Cable', sets: 2, lo: 15, hi: 15, rest: 45, inc: 'plate', finisher: true,
        setup: 'Rope on a freestyle pulley at eye height. Light and strict.' },
    ],
  },
  B: {
    name: 'Session B',
    day: 'Wednesday',
    dow: 3,
    when: '5:30am, before work',
    focus: 'Hinge, overhead, pull-down',
    exercises: [
      { id: 'rdl', tag: '1', name: 'Romanian deadlift', kit: 'Olympic bar', sets: 3, lo: 8, hi: 10, rest: 120, inc: 5,
        setup: 'Take the bar from J-hooks at mid-thigh so nothing is lifted from the floor. Straps are fine.' },
      { id: 'ohp', tag: '2a', name: 'Seated overhead press', kit: 'Smith', sets: 3, lo: 6, hi: 10, rest: 0, next: '2b', inc: 2.5,
        setup: 'Bench one notch back from upright, bar travelling just in front of your face.' },
      { id: 'latpull', tag: '2b', name: 'Lat pulldown', kit: 'Cable', sets: 3, lo: 8, hi: 12, rest: 75, inc: 'plate',
        setup: 'Stop each set with 1–2 reps left. Pull to the top of your chest.' },
      { id: 'pushdown', tag: '3a', name: 'Triceps rope pushdown', kit: 'Cable', sets: 2, lo: 12, hi: 15, rest: 0, next: '3b', inc: 'plate', finisher: true,
        setup: 'Freestyle pulley set high.' },
      { id: 'curl', tag: '3b', name: 'Cable curl', kit: 'Cable', sets: 2, lo: 12, hi: 15, rest: 45, inc: 'plate', finisher: true,
        setup: 'Same pulley dropped to the bottom.' },
    ],
  },
  C: {
    name: 'Session C',
    day: 'Friday',
    dow: 5,
    when: 'Lunch, after the dog walk',
    focus: 'Higher reps, machine-based',
    exercises: [
      { id: 'smithsquat', tag: '1', name: 'Smith squat, feet slightly forward', kit: 'Smith', sets: 3, lo: 10, hi: 12, rest: 90, inc: 5,
        setup: 'Smith bar, safety stops set. Controlled three-second descent.' },
      { id: 'incline', tag: '2a', name: 'Incline press', kit: 'Smith', sets: 3, lo: 8, hi: 12, rest: 0, next: '2b', inc: 2.5,
        setup: 'Bench at roughly 30 degrees.' },
      { id: 'sarow', tag: '2b', name: 'Single-arm cable row', kit: 'Cable', sets: 3, lo: 10, hi: 12, rest: 60, inc: 'plate', side: true,
        setup: 'Freestyle pulley at waist height, standing or half-kneeling.' },
      { id: 'lateral', tag: '3', name: 'Cable lateral raise', kit: 'Cable', sets: 2, lo: 12, hi: 15, rest: 30, inc: 'plate', side: true, finisher: true,
        setup: 'Pulley at the bottom, cable running behind you.' },
      { id: 'chinup', tag: '+', name: 'Chin-up work', kit: 'Multi-grip bar', sets: 3, lo: 3, hi: 8, rest: 60, inc: null, optional: true,
        setup: 'Only if Friday has slack. Band-assisted reps or slow five-second lowers. Leave the weight blank.' },
      { id: 'pullthrough', tag: '+', name: 'Cable pull-through', kit: 'Cable', sets: 2, lo: 12, hi: 15, rest: 45, inc: 'plate', optional: true,
        setup: 'Only if Friday has slack. Hamstrings and glutes.' },
    ],
  },
};

export const PHASES = [
  { from: 1, to: 2, name: 'Re-entry', note: '70–75% weights. Finish every set with three reps in hand. It will feel easy, and that is the point.' },
  { from: 3, to: 6, name: 'Build', note: 'Add reps, then weight. 1–2 reps in hand on the main lifts, close to the limit on finishers. Review on Friday 11 December.' },
  { from: 7, to: 7, name: 'Lighter week', note: 'Same exercises and weights, two sets instead of three.' },
  { from: 8, to: 12, name: 'Build', note: 'Add reps, then weight. Full review on Friday 5 February, then decide what comes next.' },
];

// Lifts that get a starting weight worked out from the last working weight.
export const START_LIFTS = ['squat', 'bench', 'lowrow', 'rdl', 'ohp', 'latpull', 'smithsquat', 'incline', 'sarow'];

export const REVIEW_QUESTIONS = [
  'Are all three sessions happening most weeks? If not, change the time of day before changing the plan.',
  'Are the main lifts going up? If yes, change nothing.',
  'Is the waist measurement at the navel coming down while the lifts hold or rise? That is the result you are after.',
  'Is protein landing in the target range on most days?',
];

export const GUIDE = [
  { title: 'Fitting it into 30 minutes', items: [
    'Warm-up, 4 minutes: two build-up sets of the first lift, at roughly half and three-quarters of the working weight. No separate cardio warm-up.',
    'First lift, 9 minutes: three working sets with full rests. This is the one that gets the most effort.',
    'Push and pull pair, 11 minutes: the two use different muscles, so one rests while the other works.',
    'Finisher, 3–4 minutes: the first thing to drop if you are running late. Never drop the first lift.',
    'Set the bar, pins and bench up the night before the two morning sessions.',
  ] },
  { title: 'How to progress', items: [
    'Weeks 1–2: three reps in hand on every set.',
    'From week 3: 1–2 reps in hand on the first lift and the push and pull pair, close to the limit on the finishers.',
    'When all three sets reach the top of the rep range, add 2.5 kg to upper-body lifts or 5 kg to lower-body lifts next time. On the cables, add one plate or the micro plate.',
    'If you miss a session, do the next one in order when you are next due to train. Do not double up.',
    'If a lift goes backwards two weeks running, look at protein and sleep before changing the programme.',
  ] },
  { title: 'Cable ratios', items: [
    'The freestyle pulleys run at 2:1, so the weight you feel is half the number on the stack.',
    'The lat pulldown and low row can be clipped as 1:1 or 2:1. Pick one setup for each and keep it, or the numbers stop being comparable.',
  ] },
  { title: 'Eating to keep the muscle', items: [
    'Daily protein: 1.6–2.0 g per kg of goal body weight.',
    'Eat the protein first at every meal, while the appetite lasts.',
    'Keep low-effort options in the house: Greek yoghurt or skyr, eggs, cottage cheese, tinned fish, cooked chicken, whey.',
    'A shake straight after the 5:30 sessions counts as breakfast on mornings when solid food does not appeal.',
    'Drink steadily through the day. Low fluid makes tiredness worse and sessions feel harder.',
    'If strength is falling week after week, or you are regularly too nauseous to eat, raise it with your prescriber.',
  ] },
  { title: 'Walking and the treadmill', items: [
    'Keep cardio out of the lifting sessions. The daily dog walks do the job.',
    'The treadmill tops the steps up on dark or wet days. A 10–15 minute walk after the evening meal is the easiest place to add it.',
  ] },
];

export function findExercise(id) {
  for (const k of ORDER) {
    const ex = SESSIONS[k].exercises.find(e => e.id === id);
    if (ex) return ex;
  }
  return null;
}
