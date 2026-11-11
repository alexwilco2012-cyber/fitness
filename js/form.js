// How to perform each movement: the steps in order, then the faults to watch for.
export const FORM = {
  squat: {
    how: [
      'Set the bar across your upper traps, not your neck. Hands just outside the shoulders, elbows pointing down.',
      'Stand it up and take two short steps back. Feet about shoulder width, toes turned out slightly.',
      'Take a big breath into your belly and brace, as if someone were about to poke you in the stomach.',
      'Sit down between your hips. Knees travel forward over the toes and stay in line with them. Chest stays up.',
      'Go down until the crease of your hip is level with your knee, or as low as you can with a flat back.',
      'Drive up through the whole foot. Breathe out near the top, then reset your breath before the next rep.',
    ],
    watch: ['Knees caving inwards on the way up.', 'Heels lifting off the floor.', 'Hips shooting up first, so the chest drops and it turns into a bow.'],
  },
  bench: {
    how: [
      'Lie with your eyes under the bar. Feet flat on the floor, shoulder blades squeezed back and down into the bench.',
      'Grip a little wider than your shoulders, so your forearms are vertical when the bar is on your chest.',
      'Unrack and bring the bar over your shoulders with straight arms.',
      'Lower under control to your lower chest. Elbows sit about halfway between tucked in and flared out.',
      'Touch the chest lightly, then press up and slightly back towards your face.',
    ],
    watch: ['Bouncing the bar off your chest.', 'Elbows flared straight out to the sides.', 'Backside lifting off the bench.', 'Shoulders rolling forward at the top.'],
  },
  lowrow: {
    how: [
      'Sit tall with your feet on the footplate and knees slightly bent.',
      'Start with arms long and your shoulders reaching forward a little.',
      'Pull the handle to your lower ribs, leading with the elbows.',
      'Squeeze your shoulder blades together and hold for one second.',
      'Let the handle back out slowly until your arms are straight again.',
    ],
    watch: ['Leaning back to heave the weight.', 'Shrugging the shoulders up towards your ears.', 'Rounding the lower back at the stretch.'],
  },
  facepull: {
    how: [
      'Hold the rope with thumbs pointing back towards you. Step back until your arms are straight.',
      'Pull the middle of the rope towards your eyebrows, with elbows high and wide.',
      'Split the rope apart as it comes in, finishing with your knuckles pointing at the ceiling.',
      'Hold for a second, then return slowly.',
    ],
    watch: ['Too much weight, so you lean back to move it.', 'Elbows dropping, which turns it into a row.', 'Rushing. This one only works slow and light.'],
  },
  rdl: {
    how: [
      'Stand tall with the bar against your thighs. Feet hip width, knees slightly bent and kept at that bend.',
      'Push your hips straight back, as if closing a car door with your backside.',
      'Let the bar slide down your thighs, staying in contact with your legs. Back stays flat, neck in line.',
      'Stop when your hamstrings are tight, usually just below the knee.',
      'Squeeze your glutes and bring the hips forward to stand tall. Do not lean back at the top.',
    ],
    watch: ['Back rounding as the bar gets lower.', 'Bending the knees more to get lower, which turns it into a squat.', 'Bar drifting away from your legs.'],
  },
  ohp: {
    how: [
      'Sit with your back against the pad and feet flat. Grip just wider than your shoulders.',
      'Start with the bar at chin height and forearms vertical.',
      'Brace your stomach and keep your ribs down.',
      'Press straight up until your arms are straight.',
      'Lower under control back to chin height.',
    ],
    watch: ['Lower back arching away from the pad.', 'Elbows drifting behind the bar.', 'Stopping short at the top or the bottom.'],
  },
  latpull: {
    how: [
      'Lock your thighs under the pads. Overhand grip, just wider than your shoulders.',
      'Lean back slightly and lift your chest.',
      'Start each rep by pulling your shoulder blades down, then drive your elbows down towards your back pockets.',
      'Bring the bar to the top of your chest.',
      'Control it back up until your arms are fully stretched.',
    ],
    watch: ['Swinging back to move the weight.', 'Pulling the bar behind your neck.', 'Shrugging, so the arms do all the work.'],
  },
  pushdown: {
    how: [
      'Stand tall with a slight lean forward. Pin your elbows to your sides.',
      'Start with forearms just above level.',
      'Push down until your arms are straight, spreading the rope ends apart at the bottom.',
      'Return slowly until your forearms are just above level again.',
    ],
    watch: ['Elbows drifting forward and back.', 'Leaning your body weight over the rope.', 'Cutting the bottom of the rep short.'],
  },
  curl: {
    how: [
      'Stand a step back from the pulley, tall, with elbows by your sides.',
      'Curl the handle up without letting your elbows move forward.',
      'Squeeze at the top.',
      'Lower for two to three seconds until your arms are fully straight.',
    ],
    watch: ['Swinging the body to start the rep.', 'Elbows drifting forward.', 'Dropping the weight instead of lowering it.'],
  },
  smithsquat: {
    how: [
      'Bar on your upper traps. Place your feet about one foot-length in front of the bar, shoulder width apart.',
      'Unhook the bar and brace.',
      'Lower for a count of three, sitting back and down.',
      'Stop when your thighs are level with the floor.',
      'Drive up through the whole foot, stopping just short of locking the knees hard. Twist the bar to re-hook it.',
    ],
    watch: ['Feet so far forward that your lower back rounds at the bottom.', 'Knees caving inwards.', 'Bouncing out of the bottom instead of the slow descent.'],
  },
  incline: {
    how: [
      'Lie with your eyes under the bar. Shoulder blades back and down into the bench.',
      'Grip slightly wider than your shoulders.',
      'Lower to your upper chest, just below the collarbone. Elbows about halfway between tucked and flared.',
      'Press straight up until your arms are straight.',
    ],
    watch: ['Bench set too steep, which makes it a shoulder press.', 'Bar landing too low on the chest.', 'Shoulders coming forward off the bench at the top.'],
  },
  sarow: {
    how: [
      'Stand with the opposite foot forward, or kneel on the working-side knee. Square your chest to the pulley.',
      'Start with your arm long and shoulder reaching forward.',
      'Pull your elbow back past your ribs, bringing the handle to the side of your waist.',
      'Hold for a second without twisting your body.',
      'Return slowly. Finish all reps on one side, then swap.',
    ],
    watch: ['Twisting the torso to finish the rep.', 'Shrugging the shoulder up.', 'Short reps that never reach a full stretch.'],
  },
  lateral: {
    how: [
      'Stand side-on to the pulley with the cable running behind you. Hold the handle in the hand furthest from the machine.',
      'Lean away slightly, with a soft bend in the elbow.',
      'Raise your arm out to the side, leading with the elbow, until it reaches shoulder height.',
      'Pause, then lower for two to three seconds.',
    ],
    watch: ['Shrugging the shoulder as you lift.', 'Swinging the weight up.', 'Going higher than shoulder height.', 'Too much weight. This should be light.'],
  },
  chinup: {
    how: [
      'Take an underhand or palms-facing grip at shoulder width.',
      'Band-assisted: loop the band over the bar and put one knee or foot in it. Start from a full hang with straight arms.',
      'Pull your shoulders down first, then pull your chest towards the bar until your chin clears it.',
      'Lower under control to a full hang.',
      'Slow lowers: step up to the top position, then lower for five seconds to a full hang.',
    ],
    watch: ['Half reps that never reach a full hang.', 'Kicking the legs.', 'Dropping quickly on the way down.'],
  },
  pullthrough: {
    how: [
      'Face away from the low pulley with the rope between your legs. Walk forward a few steps, feet wider than your shoulders.',
      'Push your hips back and let your hands travel back between your legs. Keep your back flat.',
      'Drive your hips forward and squeeze your glutes to stand tall.',
      'Your arms only hold the rope. The hips do the work.',
    ],
    watch: ['Squatting down instead of pushing the hips back.', 'Pulling with the arms.', 'Leaning back at the top.'],
  },
};
