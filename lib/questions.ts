export type LicenseClass = "A" | "B" | "C" | "D";
export type Endorsement = "Air Brakes" | "Hazmat" | "Tanker" | "Doubles/Triples" | "Passenger" | "School Bus";

export type Question = {
  id: number;
  // Which licenses does this question apply to?
  licenseClasses: LicenseClass[]; 
  // If present, user MUST have this endorsement enabled to see this question
  endorsements?: Endorsement[]; 
  category: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const questions: Question[] = [
  // --- GENERAL KNOWLEDGE (All CDL) ---
  {
    id: 1,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "You are driving a heavy vehicle. You must exit a highway using an off-ramp that curves downhill. You should:",
    options: [
      "Slow down to a safe speed before the curve",
      "Wait until you are in the curve to downshift",
      "Brake hard while in the curve",
      "Accelerate slightly to maintain traction"
    ],
    correctIndex: 0,
    explanation: "Braking in a curve can cause lockup or skidding. You must slow down to a safe speed *before* entering the curve."
  },
  {
    id: 2,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "Which of these statements about staying alert to drive is true?",
    options: [
      "A half-hour break is enough to cure fatigue",
      "Sleep is the only thing that can overcome fatigue",
      "Coffee and fresh air will help you stay awake for long periods",
      "Schedule trips for the hours you are normally asleep"
    ],
    correctIndex: 1,
    explanation: "Fatigue creates a debt that only sleep can pay. Caffeine and fresh air are temporary fixes that do not restore alertness."
  },
  
  // --- AIR BRAKES (Endorsement Specific) ---
  {
    id: 3,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "The safety valve is usually set to automatically open at ___ psi.",
    options: ["100", "120", "150", "175"],
    correctIndex: 2,
    explanation: "The safety valve protects the system from too much pressure. It is typically set to open at 150 psi."
  },
  {
    id: 4,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "With the engine off and the brakes released, an air brake system on a single vehicle should not leak more than ___ per minute.",
    options: ["1 psi", "2 psi", "3 psi", "4 psi"],
    correctIndex: 1,
    explanation: "For a straight truck or bus (single vehicle), the static leakage rate should be no more than 2 psi per minute."
  },

  // --- COMBINATION VEHICLES (Class A Only) ---
  {
    id: 5,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "You are coupling a tractor to a semitrailer. You have backed up but are not yet under it. What should you hook up before backing under?",
    options: [
      "The electrical service cable",
      "The emergency and service air lines",
      "Nothing; hook up lines after locking the kingpin",
      "The safety chains"
    ],
    correctIndex: 1,
    explanation: "Connect the air lines first. This allows you to supply air to the trailer brakes and ensure they are locked before you back under."
  },

  // --- HAZMAT (Endorsement Specific) ---
  {
    id: 6,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "You have loaded a hazardous material into a cargo tank. What must you do before you move the vehicle?",
    options: [
      "Call the shipper",
      "Close all manholes and valves and be sure they are free of leaks",
      "Have the tank certified by a mechanic",
      "Drive a short distance to settle the load"
    ],
    correctIndex: 1,
    explanation: "Leaks in hazmat transport are catastrophic. You must secure all manholes and valves specifically for leaks before moving."
  },

  // --- TANKER (Endorsement Specific) ---
  {
    id: 7,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "Hauling liquids in tank vehicles requires special care for two reasons. One reason is:",
    options: [
      "High center of gravity",
      "Liquids are heavier than solids",
      "Tankers have no baffles",
      "Air brakes work differently on tankers"
    ],
    correctIndex: 0,
    explanation: "Liquid loads (surge) and a high center of gravity make tankers prone to rollovers. Speed control is critical."
  },

  // --- PRE-TRIP INSPECTION (Universal Visuals) ---
  {
    id: 8,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "During your walk-around inspection, you check the tread depth on your front (steer) tires. The minimum legal depth is:",
    options: ["2/32 inch", "4/32 inch", "1/2 inch", "There is no minimum"],
    correctIndex: 1,
    explanation: "Steer tires must have at least 4/32-inch tread depth. All other tires need 2/32-inch."
  },
  {
    id: 9,
    licenseClasses: ["A", "B"],
    category: "Pre-Trip Inspection",
    text: "You are checking your steering system. What implies a defect?",
    options: [
      "Steering wheel play of more than 10 degrees (2 inches on a 20-inch wheel)",
      "Power steering fluid is full",
      "Steering arms are straight",
      "Tires turn when the wheel turns"
    ],
    correctIndex: 0,
    explanation: "Excessive play (>10 degrees) indicates worn components and is a major safety violation."
  },
  
  // --- DOUBLES/TRIPLES (Class A + Endorsement) ---
  {
    id: 10,
    licenseClasses: ["A"],
    endorsements: ["Doubles/Triples"],
    category: "Doubles/Triples",
    text: "Which of these is true about the 'crack-the-whip' effect?",
    options: [
      "It only happens on icy roads",
      "The last trailer is the most likely to turn over",
      "The tractor is the most likely to turn over",
      "It is caused by braking too hard"
    ],
    correctIndex: 1,
    explanation: "Rearward amplification causes the last trailer to swing wildly ('crack the whip') during quick lane changes, leading to rollovers."
  },
  // ===== NEXT 200 QUESTIONS (IDs 11–210) =====
  {
    id: 11,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "You are entering a sharp off-ramp curve. You should:",
    options: [
      "Brake hard in the curve",
      "Downshift only after you enter the curve",
      "Slow to a safe speed before the curve",
      "Accelerate through the curve",
    ],
    correctIndex: 2,
    explanation: "Most rollovers happen from entering curves too fast. Slow before the curve."
  },
  {
    id: 12,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "You start down a long steep downgrade. The safest plan is to:",
    options: [
      "Ride the brakes lightly the whole way",
      "Shift to a higher gear to go faster",
      "Select a low gear before you start down",
      "Coast in neutral to save fuel",
    ],
    correctIndex: 2,
    explanation: "Pick a low gear early so the engine helps control speed and prevents brake fade."
  },
  {
    id: 13,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "Your drive wheels begin to skid (rear-wheel skid). You should:",
    options: [
      "Brake harder to stop quickly",
      "Turn away from the skid",
      "Stop braking and steer where you want to go",
      "Downshift while braking hard",
    ],
    correctIndex: 2,
    explanation: "Release braking so tires can roll, then steer to regain traction."
  },
  {
    id: 14,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "Your right-front tire blows out. You should:",
    options: [
      "Hold the wheel firmly and ease off the accelerator",
      "Accelerate to stabilize the vehicle",
      "Steer hard onto the shoulder",
      "Brake hard immediately",
    ],
    correctIndex: 0,
    explanation: "Keep control first. Slow down smoothly, then move off the road when safe."
  },
  {
    id: 15,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "On wet roads, your stopping distance:",
    options: [
      "Is shorter than on dry roads",
      "Only increases for cars, not trucks",
      "Increases, so you need more following distance",
      "Is the same if you have ABS",
    ],
    correctIndex: 2,
    explanation: "Reduced traction increases stopping distance. ABS helps control but not physics."
  },
  {
    id: 16,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "To reduce hydroplaning risk, you should:",
    options: [
      "Brake hard when steering feels light",
      "Speed up to cut through water",
      "Use cruise control in rain",
      "Reduce speed and avoid standing water",
    ],
    correctIndex: 3,
    explanation: "Hydroplaning risk rises with speed and water depth."
  },
  {
    id: 17,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "If you are being tailgated, you should:",
    options: [
      "Speed up to get away",
      "Brake-check the tailgater",
      "Move to the shoulder and stop immediately",
      "Increase your following distance ahead",
    ],
    correctIndex: 3,
    explanation: "Create extra space in front so you can brake gently if needed."
  },
  {
    id: 18,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "If you miss your highway exit, you should:",
    options: [
      "Stop in your lane and wait",
      "Make a U-turn through the median",
      "Go to the next exit and turn around safely",
      "Back up on the shoulder",
    ],
    correctIndex: 2,
    explanation: "Never back on a highway. Take the next safe exit."
  },
  {
    id: 19,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "In fog, you should use:",
    options: [
      "Four-way flashers continuously while moving fast",
      "High beams",
      "Low beams",
      "No lights to reduce glare",
    ],
    correctIndex: 2,
    explanation: "Low beams reduce glare and improve visibility."
  },
  {
    id: 20,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "On black ice, the best immediate response is to:",
    options: [
      "Steer sharply to the shoulder",
      "Accelerate to regain traction",
      "Brake hard to stop quickly",
      "Make no sudden moves and slow down gently",
    ],
    correctIndex: 3,
    explanation: "Smooth steering and gentle braking help prevent skids on ice."
  },
  {
    id: 21,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "Your vehicle begins to fishtail. You should:",
    options: [
      "Brake hard",
      "Turn the wheel opposite the skid sharply",
      "Accelerate hard",
      "Steer in the direction of the skid and ease off the throttle",
    ],
    correctIndex: 3,
    explanation: "Correct gently and reduce inputs to regain traction."
  },
  {
    id: 22,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "When wheels drop off the pavement, you should:",
    options: [
      "Accelerate to climb back quickly",
      "Brake hard and steer left immediately",
      "Steer sharply back onto the road",
      "Ease off the accelerator, slow down, then return gently",
    ],
    correctIndex: 3,
    explanation: "Sharp steering can cause a rollover. Re-enter the roadway smoothly."
  },
  {
    id: 23,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "When merging onto a highway, you should:",
    options: [
      "Merge much slower than traffic",
      "Merge without signaling",
      "Use the ramp to build speed and merge smoothly",
      "Stop at the end of the ramp",
    ],
    correctIndex: 2,
    explanation: "Match traffic speed, signal, and merge smoothly."
  },
  {
    id: 24,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "You approach a railroad crossing with no signals. You should:",
    options: [
      "Speed up to cross quickly",
      "Switch lanes to get a better view at the last second",
      "Stop only if you see a train",
      "Slow down and look and listen carefully",
    ],
    correctIndex: 3,
    explanation: "Reduce speed and scan. Stop if required or if safety demands."
  },
  {
    id: 25,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "You feel drowsy while driving. The best action is to:",
    options: [
      "Turn up the radio",
      "Drink coffee and push through",
      "Open a window",
      "Stop and sleep",
    ],
    correctIndex: 3,
    explanation: "Only sleep restores alertness. Temporary fixes do not remove fatigue."
  },
  {
    id: 26,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "On a downgrade, safe speed is best controlled by:",
    options: [
      "Service brakes only",
      "Engine braking and a low gear",
      "Light use of the parking brake while moving",
      "Steering input",
    ],
    correctIndex: 1,
    explanation: "Use a low gear so the engine helps hold speed and reduces brake overheating."
  },
  {
    id: 27,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "To avoid a rollover in a curve, you should:",
    options: [
      "Brake hard mid-curve",
      "Turn sharper to keep the trailer in lane",
      "Accelerate through the curve",
      "Slow down before entering the curve",
    ],
    correctIndex: 3,
    explanation: "Speed management before the curve is the key rollover prevention."
  },
  {
    id: 28,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "In strong crosswinds, you should:",
    options: [
      "Drive faster to reduce wind time",
      "Anticipate gusts and reduce speed",
      "Use only trailer brakes",
      "Aim toward the shoulder to lean into the wind",
    ],
    correctIndex: 1,
    explanation: "Crosswinds can push high-profile vehicles. Slow down and steer smoothly."
  },
  {
    id: 29,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "To reduce skid risk, you should:",
    options: [
      "Accelerate hard out of curves",
      "Make quick steering corrections",
      "Brake and turn at the same time",
      "Slow down and use smooth steering and braking",
    ],
    correctIndex: 3,
    explanation: "Smooth inputs help keep tires within traction limits."
  },
  {
    id: 30,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "At night, you should:",
    options: [
      "Overdrive your headlights",
      "Drive faster to spend less time exposed",
      "Look only at the right edge line",
      "Increase following distance",
    ],
    correctIndex: 3,
    explanation: "Night reduces visibility. Extra space gives you time to react."
  },
  {
    id: 31,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "If a warning light comes on while driving, you should:",
    options: [
      "Turn off all lights",
      "Increase speed to reach your destination",
      "Stop where safe and investigate",
      "Ignore it until your next stop",
    ],
    correctIndex: 2,
    explanation: "Warning lights can indicate serious issues. Check as soon as it is safe."
  },
  {
    id: 32,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "A fully loaded truck compared to empty will:",
    options: [
      "Handle the same in turns",
      "Hydroplane less often",
      "Stop in a shorter distance",
      "Need a longer distance to stop",
    ],
    correctIndex: 3,
    explanation: "More weight means more momentum and longer stopping distance."
  },
  {
    id: 33,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "In heavy traffic, the safest space strategy is to:",
    options: [
      "Block two lanes to keep space",
      "Leave a gap so you have an escape route",
      "Ride the shoulder",
      "Close up tightly so no one cuts in",
    ],
    correctIndex: 1,
    explanation: "Leave space ahead so you can react without panic braking."
  },
  {
    id: 34,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "To prevent brake fade on long downgrades, you should avoid:",
    options: [
      "Using engine braking",
      "Checking mirrors",
      "Downshifting early",
      "Riding the brakes continuously",
    ],
    correctIndex: 3,
    explanation: "Light constant braking overheats brakes. Use low gear and controlled applications."
  },
  {
    id: 35,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "When parked uphill with a curb, turn your wheels:",
    options: [
      "Any direction is fine",
      "Straight ahead",
      "Toward the curb",
      "Away from the curb",
    ],
    correctIndex: 3,
    explanation: "If the vehicle rolls, it will roll back into the curb instead of into traffic."
  },
  {
    id: 36,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "When parked downhill with a curb, turn your wheels:",
    options: [
      "Straight ahead",
      "Away from the curb",
      "Toward the curb",
      "Any direction is fine",
    ],
    correctIndex: 2,
    explanation: "If it rolls, the curb helps stop it."
  },
  {
    id: 37,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "If an oncoming vehicle drifts into your lane, you should:",
    options: [
      "Speed up and honk",
      "Move left into oncoming lane",
      "Stop in your lane",
      "Move right and slow down",
    ],
    correctIndex: 3,
    explanation: "Give space and reduce speed to avoid a head-on crash."
  },
  {
    id: 38,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "If you must make an emergency lane change, you should:",
    options: [
      "Shift into a higher gear first",
      "Brake hard while turning",
      "Turn the wheel slowly over several seconds",
      "Steer quickly but smoothly, then counter-steer",
    ],
    correctIndex: 3,
    explanation: "Quick, controlled steering avoids rollover and maintains stability."
  },
  {
    id: 39,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "A common cause of skids is:",
    options: [
      "Oversteering or braking too hard",
      "Checking mirrors too often",
      "Using turn signals",
      "Driving too slowly",
    ],
    correctIndex: 0,
    explanation: "Sudden braking/steering can exceed traction and cause a skid."
  },
  {
    id: 40,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "To avoid rear-end crashes, your main defense is:",
    options: [
      "Staying in the left lane",
      "Tailgating so others cannot cut in",
      "Following very closely to react faster",
      "Keeping a safe following distance",
    ],
    correctIndex: 3,
    explanation: "Space gives time to see hazards and brake smoothly."
  },
  {
    id: 41,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "When exiting an interstate, you should begin slowing:",
    options: [
      "Only if the ramp is downhill",
      "Only if the trailer is empty",
      "After you enter the curve",
      "Before the ramp and before the curve",
    ],
    correctIndex: 3,
    explanation: "Exit ramps can be sharp. Slow early."
  },
  {
    id: 42,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "If you must stop on the shoulder, choose a spot:",
    options: [
      "On a bridge if it is wide",
      "Right after a curve",
      "At the bottom of a hill",
      "Where you can be seen from behind",
    ],
    correctIndex: 3,
    explanation: "Maximum visibility reduces the chance of being hit."
  },
  {
    id: 43,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "When backing, the safest approach is to:",
    options: [
      "Avoid mirrors",
      "Keep turning the wheel continuously",
      "Go slowly and get out and look when unsure",
      "Back quickly to reduce traffic",
    ],
    correctIndex: 2,
    explanation: "Backing is high-risk. GOAL prevents collisions."
  },
  {
    id: 44,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "Trailer offtracking means the trailer:",
    options: [
      "Follows exactly in the same track",
      "Always tracks outside the tractor path",
      "Cuts inside the tractor's turn path",
      "Never hits curbs if you turn wide",
    ],
    correctIndex: 2,
    explanation: "Rear wheels track inside turns and can strike curbs/objects."
  },
  {
    id: 45,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "If the trailer begins to sway at highway speed, you should:",
    options: [
      "Accelerate to pull it straight",
      "Turn sharply to correct it",
      "Let off the accelerator and keep steering straight",
      "Brake hard immediately",
    ],
    correctIndex: 2,
    explanation: "Reduce speed smoothly. Sudden braking/steering can worsen sway."
  },
  {
    id: 46,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "When approaching a curve in a heavy vehicle, the safest plan is to:",
    options: [
      "Downshift in the curve while braking",
      "Brake hard at the middle of the curve",
      "Brake before the curve and maintain a steady speed through it",
      "Accelerate hard in the curve",
    ],
    correctIndex: 2,
    explanation: "Braking in a curve can cause skids. Enter at a safe speed."
  },
  {
    id: 47,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "When driving on a slippery surface, you should:",
    options: [
      "Pump the brakes even with ABS",
      "Use only the parking brake while moving",
      "Use smaller, smoother steering and braking inputs",
      "Make aggressive corrections",
    ],
    correctIndex: 2,
    explanation: "Smooth inputs help keep traction on slick roads."
  },
  {
    id: 48,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "If your vehicle pulls to one side when braking, it may indicate:",
    options: [
      "Perfect trailer balance",
      "Normal operation",
      "A brake or tire problem that needs inspection",
      "Headlights are misaligned",
    ],
    correctIndex: 2,
    explanation: "Pulling can signal brake imbalance or tire issues."
  },
  {
    id: 49,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "In a work zone, you should:",
    options: [
      "Follow very closely so nobody cuts in",
      "Change lanes at the last second",
      "Ignore signs unless you see workers",
      "Plan early for lane shifts and reduced speed",
    ],
    correctIndex: 3,
    explanation: "Work zones have sudden changes. Slow down and merge early."
  },
  {
    id: 50,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "On long grades, the best time to downshift is:",
    options: [
      "Only at the top of the hill",
      "Before you lose too much speed",
      "After the engine is lugging badly",
      "Never downshift on hills",
    ],
    correctIndex: 1,
    explanation: "Downshift early to keep the engine in the power range."
  },
  {
    id: 51,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "If you are too fast for conditions, you should:",
    options: [
      "Wait until you see a hazard",
      "Rely on ABS to stop",
      "Slow down before problems develop",
      "Keep speed and steer carefully",
    ],
    correctIndex: 2,
    explanation: "Speed control is the best crash prevention."
  },
  {
    id: 52,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "When passing, you should return to your lane only after:",
    options: [
      "You cut back quickly to save time",
      "You feel you are far enough ahead",
      "You can see the passed vehicle in your mirrors",
      "You honk twice",
    ],
    correctIndex: 2,
    explanation: "Mirrors confirm safe clearance."
  },
  {
    id: 53,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "If you are boxed in by traffic, the best habit is to:",
    options: [
      "Block both lanes",
      "Tailgate so nobody merges",
      "Drive on the shoulder",
      "Keep space in front so you can change lanes if needed",
    ],
    correctIndex: 3,
    explanation: "A space cushion creates escape routes."
  },
  {
    id: 54,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "To reduce brake fade risk in mountains, you should:",
    options: [
      "Ride the brakes lightly all the way",
      "Turn off engine braking to save fuel",
      "Use a higher gear than normal",
      "Use a low gear and brake in controlled applications",
    ],
    correctIndex: 3,
    explanation: "Low gear plus controlled braking keeps brakes cooler."
  },
  {
    id: 55,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "A runaway truck ramp should be used:",
    options: [
      "Never because it damages tires",
      "Only at night",
      "Only if you are losing control of speed",
      "Only when empty",
    ],
    correctIndex: 2,
    explanation: "Runaway ramps are emergency options when you cannot control speed."
  },
  {
    id: 56,
    licenseClasses: ["A", "B", "C"],
    category: "Vehicle Control",
    text: "When driving through standing water, the safest choice is to:",
    options: [
      "Speed up to avoid getting stuck",
      "Brake hard while steering",
      "Slow down and avoid deep water if possible",
      "Use cruise control",
    ],
    correctIndex: 2,
    explanation: "Water reduces traction and can hide hazards."
  },
  {
    id: 57,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "Which statement about fatigue is true?",
    options: [
      "A short break cures fatigue for the rest of the day",
      "Fresh air keeps you awake for hours",
      "Coffee can replace sleep",
      "Sleep is the only thing that overcomes fatigue",
    ],
    correctIndex: 3,
    explanation: "Fatigue builds a sleep debt that only sleep can repay."
  },
  {
    id: 58,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "You should use four-way flashers:",
    options: [
      "Only on highways",
      "Any time you are driving at night",
      "When stopped or moving slowly and you may be a hazard",
      "Any time it is raining",
    ],
    correctIndex: 2,
    explanation: "Flashers warn other drivers that you may be a hazard."
  },
  {
    id: 59,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "Proper triangle placement for a stopped vehicle is best described as:",
    options: [
      "Place one triangle only at the rear bumper",
      "Place all triangles together behind the truck",
      "Place warnings so traffic has time to see you (typical: near, 100 ft, 200 ft)",
      "Place triangles only on the centerline",
    ],
    correctIndex: 2,
    explanation: "Spacing gives approaching drivers time to react."
  },
  {
    id: 60,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "A fire extinguisher in a CDL vehicle should be:",
    options: [
      "Mounted outside the vehicle only",
      "Locked in the sleeper",
      "Empty so it cannot leak",
      "Charged and accessible",
    ],
    correctIndex: 3,
    explanation: "It must be ready to use quickly in an emergency."
  },
  {
    id: 61,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "Seat belts are important because they:",
    options: [
      "Are optional for commercial drivers",
      "Are only for passengers",
      "Help you stay behind the wheel and in control during a crash",
      "Increase injuries",
    ],
    correctIndex: 2,
    explanation: "Seat belts help prevent being thrown from the driver's seat."
  },
  {
    id: 62,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "If your vehicle catches fire, you should:",
    options: [
      "Throw water on it immediately",
      "Open the hood fully right away",
      "Keep driving until you find a station",
      "Stop safely, shut off engine, get out, and call for help",
    ],
    correctIndex: 3,
    explanation: "Fire can spread fast. Evacuate and call emergency services."
  },
  {
    id: 63,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "If you are involved in a crash, you should first:",
    options: [
      "Argue about fault at the scene",
      "Move injured people immediately",
      "Protect the area and call for help, then give aid within your training",
      "Leave the scene if you are late",
    ],
    correctIndex: 2,
    explanation: "Secure the scene and get help before anything else."
  },
  {
    id: 64,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "Why should you avoid smoking while fueling?",
    options: [
      "It causes engine knock",
      "It is always legal but discouraged",
      "It wastes fuel",
      "Fuel vapors can ignite",
    ],
    correctIndex: 3,
    explanation: "Gasoline and diesel vapors can catch fire easily."
  },
  {
    id: 65,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "If you take medicine, you should:",
    options: [
      "Double the dose for long trips",
      "Assume it is safe if prescribed",
      "Never disclose any use to anyone",
      "Check labels and ask a professional about driving effects",
    ],
    correctIndex: 3,
    explanation: "Some medicines impair alertness and reaction time."
  },
  {
    id: 66,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "ABS on large vehicles:",
    options: [
      "Means you can follow closer",
      "Always shortens stopping distance",
      "Works only above 60 mph",
      "Helps prevent wheel lockup so you can steer while braking",
    ],
    correctIndex: 3,
    explanation: "ABS helps steering control, but you still need safe speed and distance."
  },
  {
    id: 67,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "A major cause of distracted driving is:",
    options: [
      "Looking far ahead",
      "Checking gauges briefly",
      "Scanning mirrors",
      "Using a phone or reading while driving",
    ],
    correctIndex: 3,
    explanation: "Distraction takes your eyes and mind off driving."
  },
  {
    id: 68,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "To prevent cargo shift, you should:",
    options: [
      "Load heavy items on top",
      "Rely on trailer doors",
      "Use proper securement and recheck it during the trip",
      "Secure only hazmat loads",
    ],
    correctIndex: 2,
    explanation: "Shifting cargo can cause rollovers and loss of control."
  },
  {
    id: 69,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "In winter conditions, you should:",
    options: [
      "Brake hard to test traction",
      "Reduce speed and increase following distance",
      "Follow closer so others cannot cut in",
      "Use cruise control on slick roads",
    ],
    correctIndex: 1,
    explanation: "Ice and snow increase stopping distance and reduce traction."
  },
  {
    id: 70,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "If you smell smoke in the cab, you should:",
    options: [
      "Open windows and keep driving",
      "Turn off all electricals while moving",
      "Ignore it if gauges look normal",
      "Stop safely and investigate",
    ],
    correctIndex: 3,
    explanation: "Smoke may indicate a fire or mechanical failure."
  },
  {
    id: 71,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "In hot weather, a sign of heat stress is:",
    options: [
      "Improved reaction time",
      "Better vision at night",
      "Shivering",
      "Heavy sweating, dizziness, or cramps",
    ],
    correctIndex: 3,
    explanation: "Heat stress reduces alertness and can be dangerous."
  },
  {
    id: 72,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "When driving near motorcycles, you should:",
    options: [
      "Tailgate to see around them",
      "Pass without signaling",
      "Give extra space and avoid sudden moves",
      "Assume they can stop instantly",
    ],
    correctIndex: 2,
    explanation: "Motorcycles are smaller and less stable; give them room."
  },
  {
    id: 73,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "When you stop on the roadside, the safest practice is to:",
    options: [
      "Leave the engine running with doors open",
      "Set parking brake, put out warnings, and stay alert to traffic",
      "Stand behind the trailer in the lane",
      "Turn off all lights at night",
    ],
    correctIndex: 1,
    explanation: "Visibility and warning devices reduce secondary crashes."
  },
  {
    id: 74,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "If you get frustrated in traffic, the best habit is to:",
    options: [
      "Use the horn constantly",
      "Speed up to teach others a lesson",
      "Weave through lanes",
      "Stay calm and avoid aggressive driving",
    ],
    correctIndex: 3,
    explanation: "Aggressive driving increases crash risk."
  },
  {
    id: 75,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "If you need to stop quickly, the safest place is usually:",
    options: [
      "Just after a curve",
      "At the crest of a hill",
      "In a tunnel",
      "Off the roadway where you can be seen",
    ],
    correctIndex: 3,
    explanation: "Choose visibility and reduce the chance of being hit."
  },
  {
    id: 76,
    licenseClasses: ["A", "B", "C"],
    category: "Safety Systems",
    text: "The best way to handle glare from headlights at night is to:",
    options: [
      "Use high beams back at them",
      "Close your eyes briefly",
      "Look slightly to the right edge line and slow down if needed",
      "Stare directly at the lights",
    ],
    correctIndex: 2,
    explanation: "Avoid direct glare and maintain a safe speed."
  },
  {
    id: 77,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Minimum legal tread depth for steer tires is:",
    options: [
      "1/32 inch",
      "2/32 inch",
      "There is no minimum",
      "4/32 inch",
    ],
    correctIndex: 3,
    explanation: "Steer tires need at least 4/32-inch tread depth."
  },
  {
    id: 78,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Minimum legal tread depth for other tires is:",
    options: [
      "4/32 inch",
      "There is no minimum",
      "2/32 inch",
      "6/32 inch",
    ],
    correctIndex: 2,
    explanation: "Drive and trailer tires need at least 2/32-inch tread depth."
  },
  {
    id: 79,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A tire sidewall bulge means the tire is:",
    options: [
      "Fine if it holds air",
      "Unsafe and should be replaced",
      "Normal on heavy vehicles",
      "Only a problem on trailer tires",
    ],
    correctIndex: 1,
    explanation: "Bulges can indicate internal damage and blowout risk."
  },
  {
    id: 80,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Missing lug nuts on a wheel are:",
    options: [
      "Normal if the wheel looks tight",
      "Only a defect on steer wheels",
      "A serious defect",
      "Not important if the tire is new",
    ],
    correctIndex: 2,
    explanation: "Missing lugs can lead to wheel separation."
  },
  {
    id: 81,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Excessive steering wheel play is a defect because it may indicate:",
    options: [
      "Normal power steering operation",
      "Good alignment",
      "Worn steering parts",
      "New tires",
    ],
    correctIndex: 2,
    explanation: "Too much play reduces control and signals wear."
  },
  {
    id: 82,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Brake hoses/lines should:",
    options: [
      "Rub on moving parts",
      "Have no leaks, cuts, or abrasion",
      "Leak slightly to lubricate",
      "Be taped if cracked",
    ],
    correctIndex: 1,
    explanation: "Damaged lines can cause brake failure."
  },
  {
    id: 83,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A cracked brake drum should be treated as:",
    options: [
      "Fixed by spraying water on it",
      "Fine if brakes still stop",
      "Cosmetic only",
      "Unsafe and reported",
    ],
    correctIndex: 3,
    explanation: "Cracked drums can fail and reduce braking."
  },
  {
    id: 84,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Oil or grease leaking from a hub may indicate:",
    options: [
      "High tire tread",
      "Normal lubrication",
      "Headlight misalignment",
      "A wheel bearing problem",
    ],
    correctIndex: 3,
    explanation: "Hub oil/grease leaks can signal failing bearings."
  },
  {
    id: 85,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "If the ABS warning light stays on after startup, it means:",
    options: [
      "ABS is only for trailers so ignore it",
      "ABS is working extra well",
      "You can drive faster in rain",
      "ABS may not be working properly",
    ],
    correctIndex: 3,
    explanation: "A lit ABS light indicates a fault that needs attention."
  },
  {
    id: 86,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "During a pre-trip, you should check lights to ensure:",
    options: [
      "Lights are optional in daylight",
      "Only headlights work",
      "Only brake lights work",
      "All required lights and reflectors work",
    ],
    correctIndex: 3,
    explanation: "Working lights are required for visibility and legality."
  },
  {
    id: 87,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A cracked windshield is acceptable only if it:",
    options: [
      "Is longer than 6 inches",
      "Is directly in front of the steering wheel",
      "Does not obstruct the driver's view and meets state rules",
      "Is in the driver's view",
    ],
    correctIndex: 2,
    explanation: "Visibility must not be impaired."
  },
  {
    id: 88,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "You should check tire inflation using:",
    options: [
      "A hammer",
      "A kick test only",
      "A quick glance",
      "A tire gauge",
    ],
    correctIndex: 3,
    explanation: "Use a gauge; kicking is unreliable."
  },
  {
    id: 89,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "If windshield wipers do not clear properly, you should:",
    options: [
      "Drive anyway",
      "Lean out the window to see",
      "Increase speed to blow water off",
      "Repair or replace before driving",
    ],
    correctIndex: 3,
    explanation: "Visibility is critical for safe driving."
  },
  {
    id: 90,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A broken turn signal lens should be:",
    options: [
      "Ignored if the bulb works",
      "Removed so it does not distract",
      "Covered with mud to reduce glare",
      "Repaired if required and the light must be visible",
    ],
    correctIndex: 3,
    explanation: "Signals must be visible to other drivers."
  },
  {
    id: 91,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A fuel leak should be:",
    options: [
      "Ignored if it is small",
      "Fixed or reported before driving",
      "Covered with dirt",
      "Left until the end of the trip",
    ],
    correctIndex: 1,
    explanation: "Fuel leaks are fire hazards."
  },
  {
    id: 92,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Loose or missing parts in the steering system are:",
    options: [
      "Fine if you drive slowly",
      "Only cosmetic",
      "Normal on older trucks",
      "Critical defects",
    ],
    correctIndex: 3,
    explanation: "Steering defects can cause loss of control."
  },
  {
    id: 93,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A cracked frame member is:",
    options: [
      "Fixed by driving faster",
      "Normal wear",
      "Only a problem on trailers",
      "A serious defect",
    ],
    correctIndex: 3,
    explanation: "Frame damage can lead to structural failure."
  },
  {
    id: 94,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A missing cotter pin on steering linkage is:",
    options: [
      "Only a defect on trailers",
      "Not important if greased",
      "Fine if the nut is tight today",
      "A serious defect",
    ],
    correctIndex: 3,
    explanation: "Cotter pins prevent fasteners from backing off."
  },
  {
    id: 95,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "During in-cab check, you should verify:",
    options: [
      "Only the radio works",
      "Only the GPS works",
      "Seat belt is optional",
      "Gauges and warning lights work properly",
    ],
    correctIndex: 3,
    explanation: "In-cab checks confirm safe operation."
  },
  {
    id: 96,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "The horn should be checked to ensure it:",
    options: [
      "Plays music",
      "Is used only in emergencies so no need to test",
      "Is optional on CDL vehicles",
      "Works and is loud enough",
    ],
    correctIndex: 3,
    explanation: "A working horn helps warn others."
  },
  {
    id: 97,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "If coolant is low, you should:",
    options: [
      "Drive faster to cool the engine",
      "Add coolant and check for leaks",
      "Ignore it",
      "Add oil instead",
    ],
    correctIndex: 1,
    explanation: "Low coolant can cause overheating; leaks must be addressed."
  },
  {
    id: 98,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A suspension defect includes:",
    options: [
      "Dust on the spring",
      "A tight U-bolt",
      "A missing or broken leaf spring",
      "Fresh paint",
    ],
    correctIndex: 2,
    explanation: "Broken springs reduce stability and control."
  },
  {
    id: 99,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "The exhaust system should be checked for:",
    options: [
      "Only noise at idle",
      "Shiny metal",
      "Extra smoke is good",
      "Leaks and loose parts",
    ],
    correctIndex: 3,
    explanation: "Exhaust leaks can cause fumes and fire risk."
  },
  {
    id: 100,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Mirrors should be:",
    options: [
      "Removed to reduce blind spots",
      "Cracked so they flex",
      "Folded in for aerodynamics",
      "Securely mounted and clean",
    ],
    correctIndex: 3,
    explanation: "Secure, clean mirrors are required for visibility."
  },
  {
    id: 101,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Trailer landing gear should be:",
    options: [
      "Bent but usable",
      "Removed for weight",
      "Left down to stabilize turns",
      "Fully raised and secured before moving",
    ],
    correctIndex: 3,
    explanation: "Down landing gear can strike the road and cause a crash."
  },
  {
    id: 102,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Rims should have:",
    options: [
      "No cracks, bends, or illegal welds",
      "Weld repairs are always OK",
      "Any crack is fine if tire holds air",
      "Rust holes are OK",
    ],
    correctIndex: 0,
    explanation: "Damaged rims can fail and cause blowouts."
  },
  {
    id: 103,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Battery area should be checked for:",
    options: [
      "Water on terminals is good",
      "No need to secure the battery",
      "Warm cables are always normal",
      "Loose connections and corrosion",
    ],
    correctIndex: 3,
    explanation: "Loose/corroded connections can cause starting and charging failures."
  },
  {
    id: 104,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "If a trailer electrical line is loose, it can cause:",
    options: [
      "Lower tire pressure",
      "Higher fuel economy",
      "More air pressure",
      "Trailer lights to fail",
    ],
    correctIndex: 3,
    explanation: "Electrical connection issues often cause lighting problems."
  },
  {
    id: 105,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A kinked air hose or gladhand line should be:",
    options: [
      "Oiled inside the line",
      "Ignored if brakes work now",
      "Tied in a knot",
      "Fixed before driving",
    ],
    correctIndex: 3,
    explanation: "Kinks restrict air flow and can affect braking."
  },
  {
    id: 106,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Mud flaps help by:",
    options: [
      "Increasing horsepower",
      "Lowering engine temperature",
      "Improving brake response",
      "Reducing spray and debris thrown at others",
    ],
    correctIndex: 3,
    explanation: "Mud flaps improve road safety and visibility."
  },
  {
    id: 107,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Cargo securement should be checked:",
    options: [
      "Only for hazmat loads",
      "Only when the trailer is empty",
      "Only at the end of the day",
      "At the start and during the trip",
    ],
    correctIndex: 3,
    explanation: "Loads can shift; recheck securement to prevent crashes."
  },
  {
    id: 108,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "If brake pedal feels spongy on hydraulic brakes, it may indicate:",
    options: [
      "Normal operation",
      "A fully charged air system",
      "Better stopping power",
      "Air in the system or a leak",
    ],
    correctIndex: 3,
    explanation: "Spongy feel suggests hydraulic problems and reduced braking."
  },
  {
    id: 109,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Reflective tape/markings should be:",
    options: [
      "Clean and visible",
      "Painted over",
      "Removed to reduce glare",
      "Only on the front of the trailer",
    ],
    correctIndex: 0,
    explanation: "Reflective markings help other drivers see you at night."
  },
  {
    id: 110,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "If you find a slow air leak during inspection, you should:",
    options: [
      "Cover it with tape",
      "Report and fix it before driving",
      "Ignore it",
      "Drain the fuel tank",
    ],
    correctIndex: 1,
    explanation: "Air leaks can worsen and reduce braking ability."
  },
  {
    id: 111,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Belts (alternator/water pump) should be checked for:",
    options: [
      "Loose belts are better",
      "Oil-soaked belts are fine",
      "Cracks, frays, and proper tension",
      "Belts should touch hot exhaust",
    ],
    correctIndex: 2,
    explanation: "Worn/loose belts can fail and cause overheating."
  },
  {
    id: 112,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "If trailer doors do not latch, you should:",
    options: [
      "Drive faster so they stay closed",
      "Fix or secure properly before moving",
      "Use only rope with no latch",
      "Leave doors open",
    ],
    correctIndex: 1,
    explanation: "Unsecured doors risk cargo loss and roadway hazards."
  },
  {
    id: 113,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "Wheel bearing trouble may show as:",
    options: [
      "New paint on hub",
      "Bright headlights",
      "Heat, noise, or leaking hub oil/grease",
      "High tread depth",
    ],
    correctIndex: 2,
    explanation: "Bearing failure can lead to wheel lockup or separation."
  },
  {
    id: 114,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A safe wheel includes:",
    options: [
      "Any crack is OK if small",
      "No cracks in the rim and no missing lugs",
      "Rust holes are acceptable",
      "Missing lugs are fine if you torque later",
    ],
    correctIndex: 1,
    explanation: "Wheel defects can cause blowouts or wheel separation."
  },
  {
    id: 115,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "During walk-around, you should check for:",
    options: [
      "Only paint condition",
      "Only air freshener smell",
      "Only company decals",
      "Leaks under the vehicle",
    ],
    correctIndex: 3,
    explanation: "Leaks can signal mechanical failure or fire risk."
  },
  {
    id: 116,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "If a headlight is out, you should:",
    options: [
      "Ignore it because you have marker lights",
      "Repair it before driving if required",
      "Drive only in daylight forever",
      "Cover the other headlight too",
    ],
    correctIndex: 1,
    explanation: "Working headlights are required for visibility and legality."
  },
  {
    id: 117,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "If a brake light is not working, you should:",
    options: [
      "Ignore it on short trips",
      "Drive with hazards instead",
      "Use hand signals only",
      "Repair it before operating",
    ],
    correctIndex: 3,
    explanation: "Brake lights warn drivers behind you that you are stopping."
  },
  {
    id: 118,
    licenseClasses: ["A", "B", "C"],
    category: "Pre-Trip Inspection",
    text: "A steering box should be:",
    options: [
      "Held by one bolt only",
      "Loose for easier turning",
      "Securely mounted with no leaks",
      "Leaking is normal",
    ],
    correctIndex: 2,
    explanation: "Loose mounting or leaks indicate a defect."
  },
  {
    id: 119,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Low air pressure warning should activate around:",
    options: [
      "60 psi",
      "20 psi",
      "40 psi",
      "120 psi",
    ],
    correctIndex: 0,
    explanation: "Low air warning is required and typically comes on around 60 psi."
  },
  {
    id: 120,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Spring brakes typically begin to apply around:",
    options: [
      "80 to 90 psi",
      "100 psi",
      "60 psi",
      "20 to 45 psi",
    ],
    correctIndex: 3,
    explanation: "Spring brakes apply when air pressure drops to the 20-45 psi range."
  },
  {
    id: 121,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Governor cut-out pressure is typically:",
    options: [
      "80 psi",
      "100 psi",
      "150 psi",
      "120 to 135 psi",
    ],
    correctIndex: 3,
    explanation: "Many systems cut out around 120-135 psi."
  },
  {
    id: 122,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Governor cut-in pressure is typically about:",
    options: [
      "60 psi",
      "40 psi",
      "150 psi",
      "100 psi",
    ],
    correctIndex: 3,
    explanation: "Many systems cut in around about 100 psi."
  },
  {
    id: 123,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Static air leakage (brakes released) for a single vehicle should be no more than:",
    options: [
      "3 psi per minute",
      "1 psi per minute",
      "2 psi per minute",
      "4 psi per minute",
    ],
    correctIndex: 2,
    explanation: "Single vehicles typically should not leak more than 2 psi/min with brakes released."
  },
  {
    id: 124,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Static air leakage (brakes released) for combination vehicles should be no more than:",
    options: [
      "4 psi per minute",
      "2 psi per minute",
      "1 psi per minute",
      "3 psi per minute",
    ],
    correctIndex: 3,
    explanation: "Combination vehicles typically should not leak more than 3 psi/min with brakes released."
  },
  {
    id: 125,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Applied air leakage (brakes held) for a single vehicle should be no more than:",
    options: [
      "3 psi per minute",
      "6 psi per minute",
      "2 psi per minute",
      "4 psi per minute",
    ],
    correctIndex: 0,
    explanation: "With brakes applied, single vehicles should not leak more than 3 psi/min."
  },
  {
    id: 126,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Applied air leakage (brakes held) for combination vehicles should be no more than:",
    options: [
      "2 psi per minute",
      "5 psi per minute",
      "3 psi per minute",
      "4 psi per minute",
    ],
    correctIndex: 3,
    explanation: "With brakes applied, combination vehicles should not leak more than 4 psi/min."
  },
  {
    id: 127,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "An air dryer is used to:",
    options: [
      "Cool the engine",
      "Lubricate brake shoes",
      "Remove moisture and oil from the air",
      "Increase air pressure",
    ],
    correctIndex: 2,
    explanation: "Dry air helps prevent freezing and corrosion."
  },
  {
    id: 128,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Brake lag means:",
    options: [
      "Brakes work only on trailers",
      "Air brakes respond instantly",
      "There is a delay between pedal push and brake action",
      "Brakes work only at low speed",
    ],
    correctIndex: 2,
    explanation: "Air takes time to travel through lines, causing a slight delay."
  },
  {
    id: 129,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "If the low air warning does not work, you should:",
    options: [
      "Drive anyway",
      "Release the parking brake and go",
      "Add engine oil",
      "Report it and do not drive until fixed",
    ],
    correctIndex: 3,
    explanation: "A working low air warning is required for safe operation."
  },
  {
    id: 130,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "You should drain air tanks:",
    options: [
      "Never",
      "Only after a brake fire",
      "Daily to remove moisture and oil",
      "Only in summer",
    ],
    correctIndex: 2,
    explanation: "Draining prevents water buildup, freezing, and contamination."
  },
  {
    id: 131,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "A dual air brake system:",
    options: [
      "Uses hydraulic fluid instead of air",
      "Eliminates the need to drain tanks",
      "Has one tank only",
      "Separates systems for safety (two circuits)",
    ],
    correctIndex: 3,
    explanation: "Dual systems provide redundancy if one circuit fails."
  },
  {
    id: 132,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "ABS on air brake vehicles:",
    options: [
      "Lets you drive faster in rain",
      "Works only above 60 mph",
      "Helps prevent wheel lockup so you can steer while braking",
      "Means you should pump the brakes",
    ],
    correctIndex: 2,
    explanation: "ABS improves control but does not reduce stopping distance in all cases."
  },
  {
    id: 133,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "If brakes feel weak after long braking on a downgrade, you may have:",
    options: [
      "Governor cut-in",
      "Brake fade from overheating",
      "Better traction",
      "ABS activation",
    ],
    correctIndex: 1,
    explanation: "Overheated brakes lose effectiveness (fade)."
  },
  {
    id: 134,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "The parking brake on air brake vehicles is held by:",
    options: [
      "Air pressure only",
      "Hydraulic fluid",
      "Engine vacuum",
      "Spring pressure",
    ],
    correctIndex: 3,
    explanation: "Spring brakes apply when air pressure is lost or parking brakes are set."
  },
  {
    id: 135,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "A safety valve protects the air system by:",
    options: [
      "Locking the brakes",
      "Cooling brake drums",
      "Adding air",
      "Releasing air if pressure gets too high",
    ],
    correctIndex: 3,
    explanation: "It prevents overpressure damage by venting at high pressure."
  },
  {
    id: 136,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "To test parking (spring) brakes, you should:",
    options: [
      "Turn off engine on a hill",
      "Gently tug against them at low speed in a safe area",
      "Drive fast and pull the knob",
      "Pump the accelerator to test",
    ],
    correctIndex: 1,
    explanation: "A controlled tug test verifies parking brakes hold."
  },
  {
    id: 137,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Crossed air lines during coupling can cause:",
    options: [
      "No issue",
      "Lower tire pressure",
      "Higher fuel economy",
      "Trailer brakes to work incorrectly or lock up",
    ],
    correctIndex: 3,
    explanation: "Crossed lines can apply brakes unexpectedly and cause loss of control."
  },
  {
    id: 138,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "An alcohol evaporator (if equipped) helps:",
    options: [
      "Reduce brake shoe wear",
      "Reduce air line freeze-up",
      "Increase compressor output",
      "Remove alcohol from fuel",
    ],
    correctIndex: 1,
    explanation: "It helps prevent freezing in cold climates."
  },
  {
    id: 139,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "If the air compressor fails completely, you should:",
    options: [
      "Pump brakes to build pressure",
      "Stop safely as air pressure drops and spring brakes apply",
      "Use parking brake while moving",
      "Keep driving until empty",
    ],
    correctIndex: 1,
    explanation: "You cannot safely operate without air supply; stop safely."
  },
  {
    id: 140,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "When parking, you should:",
    options: [
      "Hold service brake only",
      "Use trailer hand valve only",
      "Leave it in neutral with engine running",
      "Set the parking (spring) brakes",
    ],
    correctIndex: 3,
    explanation: "Parking brakes secure the vehicle when stopped."
  },
  {
    id: 141,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "During air build-up test, slow build-up may indicate:",
    options: [
      "Good brake adjustment",
      "Weak compressor or restriction",
      "High tire pressure",
      "Normal operation",
    ],
    correctIndex: 1,
    explanation: "Slow pressure rise suggests a compressor or system issue."
  },
  {
    id: 142,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "If spring brakes come on while driving, you should:",
    options: [
      "Use trailer hand valve only",
      "Accelerate to build air",
      "Stop as soon as safely possible",
      "Keep driving to destination",
    ],
    correctIndex: 2,
    explanation: "Spring brakes applying indicates low air or failure."
  },
  {
    id: 143,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Air tanks most commonly collect:",
    options: [
      "Coolant",
      "Sand",
      "Moisture and oil",
      "Fuel",
    ],
    correctIndex: 2,
    explanation: "Compressed air carries moisture and compressor oil into the tanks."
  },
  {
    id: 144,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "Stab braking is mainly used on:",
    options: [
      "Vehicles with ABS only",
      "Any vehicle at any time",
      "Vehicles without ABS to help control wheel lockup",
      "Motorcycles",
    ],
    correctIndex: 2,
    explanation: "Without ABS, stab braking can help avoid prolonged lockup."
  },
  {
    id: 145,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "To release trailer spring brakes after coupling, you must:",
    options: [
      "Pull the trailer hand valve only",
      "Disconnect air lines",
      "Pump the brake pedal rapidly",
      "Charge the trailer air system first",
    ],
    correctIndex: 3,
    explanation: "Trailer spring brakes release when air pressure builds in the trailer system."
  },
  {
    id: 146,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Air Brakes"],
    category: "Air Brakes",
    text: "If the air pressure rises higher than normal and the safety valve opens, it is to:",
    options: [
      "Increase braking power",
      "Cool the air tanks",
      "Prevent excessive air pressure in the system",
      "Lubricate brake drums",
    ],
    correctIndex: 2,
    explanation: "The safety valve protects the system by venting air if pressure gets too high."
  },
  {
    id: 147,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "After coupling, a tug test is used to:",
    options: [
      "Warm the tires",
      "Test engine power only",
      "Test the trailer lights",
      "Make sure the kingpin is locked",
    ],
    correctIndex: 3,
    explanation: "A tug test confirms the coupling is secure."
  },
  {
    id: 148,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "If the trailer is too high when backing under, you risk:",
    options: [
      "Lower fuel use",
      "A high hook and possible uncoupling",
      "Better braking",
      "A smoother coupling",
    ],
    correctIndex: 1,
    explanation: "A high hook can prevent a secure lock and cause the trailer to drop."
  },
  {
    id: 149,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "The tractor protection valve is designed to:",
    options: [
      "Reduce trailer weight",
      "Lock the fifth wheel",
      "Protect tractor air supply if trailer air line breaks",
      "Increase trailer speed",
    ],
    correctIndex: 2,
    explanation: "It prevents tractor air from draining through a trailer problem."
  },
  {
    id: 150,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "A major cause of rollover in combination vehicles is:",
    options: [
      "Using engine brake",
      "Driving in daylight",
      "Low windshield washer fluid",
      "Taking turns or ramps too fast",
    ],
    correctIndex: 3,
    explanation: "High speed in curves and ramps causes most rollovers."
  },
  {
    id: 151,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "If the trailer begins to sway at highway speed, you should:",
    options: [
      "Brake hard",
      "Accelerate",
      "Let off the accelerator and keep steering straight",
      "Turn sharply",
    ],
    correctIndex: 2,
    explanation: "Reduce speed smoothly; sudden moves can worsen sway."
  },
  {
    id: 152,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "To reduce jackknife risk, you should:",
    options: [
      "Shift into neutral while braking",
      "Brake hard in a curve",
      "Always use trailer hand valve only",
      "Brake early and smoothly, especially on slippery roads",
    ],
    correctIndex: 3,
    explanation: "Smooth braking reduces wheel lockup and jackknife risk."
  },
  {
    id: 153,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "If a trailer starts to swing out (trailer skid), the best response is to:",
    options: [
      "Apply tractor brakes hard",
      "Turn sharply into the skid",
      "Accelerate hard",
      "Apply the trailer brakes to straighten",
    ],
    correctIndex: 3,
    explanation: "Trailer braking can help straighten without jackknifing."
  },
  {
    id: 154,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "Too little weight on tractor drive axles can cause:",
    options: [
      "No effect",
      "Better traction",
      "Shorter stopping distance",
      "Poor traction and drive-wheel skid",
    ],
    correctIndex: 3,
    explanation: "Drive axles need weight for traction."
  },
  {
    id: 155,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "Before backing under a trailer, you should be sure:",
    options: [
      "Trailer brakes are released",
      "Landing gear is up",
      "Trailer brakes are locked so it will not roll",
      "Trailer is empty",
    ],
    correctIndex: 2,
    explanation: "Locked trailer brakes prevent trailer movement during coupling."
  },
  {
    id: 156,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "When uncoupling, you should:",
    options: [
      "Pull out fast",
      "Drop the trailer without chocking",
      "Disconnect air lines last and leave them hanging",
      "Chock trailer wheels before pulling out",
    ],
    correctIndex: 3,
    explanation: "Chocks prevent trailer movement."
  },
  {
    id: 157,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "Locking jaws should:",
    options: [
      "Touch the trailer tires",
      "Be greased so they stay open",
      "Fully close around the shank of the kingpin",
      "Be partly open",
    ],
    correctIndex: 2,
    explanation: "Jaws must lock completely to prevent uncoupling."
  },
  {
    id: 158,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "The trailer offtracks most in turns because:",
    options: [
      "It always tracks outside",
      "It never offtracks",
      "It follows exactly",
      "Trailer rear wheels cut inside the tractor path",
    ],
    correctIndex: 3,
    explanation: "You must allow space for the trailer to cut inside."
  },
  {
    id: 159,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "In a combination, backing is risky mainly because:",
    options: [
      "It is always illegal",
      "It uses too much fuel",
      "You have large blind spots behind the trailer",
      "Trailer brakes will not work",
    ],
    correctIndex: 2,
    explanation: "Limited visibility makes backing hazardous."
  },
  {
    id: 160,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "If the trailer breaks away while driving, you should:",
    options: [
      "Speed up",
      "Chase it",
      "Turn sharply to avoid it",
      "Control your vehicle and stop safely",
    ],
    correctIndex: 3,
    explanation: "Maintain control and stop in a safe area."
  },
  {
    id: 161,
    licenseClasses: ["A"],
    category: "Combination Vehicles",
    text: "If you brake hard on slippery roads, the greatest danger is:",
    options: [
      "Engine overheating",
      "Better traction",
      "Jackknife or trailer swing",
      "Higher fuel economy",
    ],
    correctIndex: 2,
    explanation: "Wheel lockup can cause jackknife or trailer skid."
  },
  {
    id: 162,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "You must not accept a hazmat package if it is:",
    options: [
      "On a pallet",
      "Leaking",
      "Sealed",
      "Heavy",
    ],
    correctIndex: 1,
    explanation: "Leaking packages must not be transported."
  },
  {
    id: 163,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "Hazmat shipping papers must be:",
    options: [
      "Thrown away after pickup",
      "Stored under the mattress",
      "Locked in the trunk",
      "Within immediate reach while driving",
    ],
    correctIndex: 3,
    explanation: "They must be accessible quickly in an emergency."
  },
  {
    id: 164,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "Placards (when required) must be displayed:",
    options: [
      "Only on the rear",
      "On all four sides",
      "Only on the driver door",
      "Only on the front",
    ],
    correctIndex: 1,
    explanation: "Placards warn others from any direction."
  },
  {
    id: 165,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "When hauling hazmat, smoking is prohibited:",
    options: [
      "Only inside the cab",
      "Only at night",
      "Only at fuel stops",
      "Within 25 feet of the vehicle",
    ],
    correctIndex: 3,
    explanation: "Hazardous materials can ignite from sparks or flame."
  },
  {
    id: 166,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "If you discover a hazmat leak, you should first:",
    options: [
      "Hide it with dirt",
      "Keep driving to destination",
      "Protect yourself and the public and notify authorities",
      "Wash it with water immediately",
    ],
    correctIndex: 2,
    explanation: "Safety and notification come first."
  },
  {
    id: 167,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "A 'DANGEROUS' placard may be used for:",
    options: [
      "Only explosives",
      "Only flammable liquids",
      "Any Class 9 material",
      "Certain mixed loads when allowed",
    ],
    correctIndex: 3,
    explanation: "Rules allow it for some mixed loads under specific conditions."
  },
  {
    id: 168,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "Hazmat labels and placards are meant to:",
    options: [
      "Show company branding",
      "Decorate the vehicle",
      "Replace shipping papers",
      "Communicate the hazard class",
    ],
    correctIndex: 3,
    explanation: "They identify hazards for handlers and responders."
  },
  {
    id: 169,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "When parking with hazmat, you must:",
    options: [
      "Leave it unlocked for inspectors",
      "Park anywhere if it is quick",
      "Follow attendance/secure rules and avoid unnecessary risk",
      "Park in a tunnel",
    ],
    correctIndex: 2,
    explanation: "Hazmat vehicles often must be attended or secured."
  },
  {
    id: 170,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "When loading hazmat, you should:",
    options: [
      "Remove labels to prevent theft",
      "Ignore compatibility charts",
      "Follow segregation and compatibility rules",
      "Load incompatible materials together",
    ],
    correctIndex: 2,
    explanation: "Segregation prevents dangerous reactions."
  },
  {
    id: 171,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "Emergency response info is found on:",
    options: [
      "Tire sidewall",
      "Cab registration card only",
      "Shipping papers and response information",
      "Fuel receipt",
    ],
    correctIndex: 2,
    explanation: "Response information must be available to the driver and responders."
  },
  {
    id: 172,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "If a package is marked 'This Side Up', you should:",
    options: [
      "Ignore it",
      "Open it to check contents",
      "Load it sideways",
      "Keep it upright",
    ],
    correctIndex: 3,
    explanation: "Orientation markings must be followed."
  },
  {
    id: 173,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "Hazmat routing restrictions may apply to:",
    options: [
      "All parking lots",
      "All private driveways",
      "Tunnels and bridges",
      "All rural roads",
    ],
    correctIndex: 2,
    explanation: "Some structures restrict hazmat for safety."
  },
  {
    id: 174,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "If a shipper gives hazmat papers, you should:",
    options: [
      "Hide them in a bag",
      "Sign without reading",
      "Verify papers match the load",
      "Throw them away after leaving",
    ],
    correctIndex: 2,
    explanation: "Drivers must verify paperwork is complete and correct."
  },
  {
    id: 175,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "Placards are required when:",
    options: [
      "Only for Class A vehicles",
      "Load is below threshold",
      "You feel like it",
      "Material and quantity meet placarding rules",
    ],
    correctIndex: 3,
    explanation: "Placarding depends on regulations for quantity and class."
  },
  {
    id: 176,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "If carrying a toxic inhalation hazard, you should:",
    options: [
      "Smoke near the vehicle",
      "Park near crowds",
      "Avoid heavily populated routes when possible",
      "Ignore route restrictions",
    ],
    correctIndex: 2,
    explanation: "Routing reduces public exposure risk."
  },
  {
    id: 177,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "Transporting explosives requires:",
    options: [
      "Keeping people close for warmth",
      "Parking next to open flames",
      "Extra caution with parking and attendance rules",
      "Ignoring rules on short trips",
    ],
    correctIndex: 2,
    explanation: "Explosives have strict safety requirements."
  },
  {
    id: 178,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "Before moving a hazmat cargo tank, you must:",
    options: [
      "Call dispatch first",
      "Open valves to vent",
      "Close manholes/valves and check for leaks",
      "Drive to settle load",
    ],
    correctIndex: 2,
    explanation: "Securing the tank prevents leaks and spills."
  },
  {
    id: 179,
    licenseClasses: ["A", "B", "C"],
    endorsements: ["Hazmat"],
    category: "Hazardous Materials",
    text: "If hazmat packages are damaged during loading, you should:",
    options: [
      "Hide the damage",
      "Refuse or report and do not transport until safe",
      "Tape and continue",
      "Drive faster to finish sooner",
    ],
    correctIndex: 1,
    explanation: "Damaged packages can leak and create a hazard."
  },
  {
    id: 180,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "The main risk with liquid surge is that it can:",
    options: [
      "Stop the engine",
      "Push the vehicle and increase rollover or stopping distance",
      "Improve braking",
      "Make the vehicle lighter",
    ],
    correctIndex: 1,
    explanation: "Liquid movement changes balance and traction."
  },
  {
    id: 181,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "Baffles help by:",
    options: [
      "Increasing load height",
      "Making turns sharper",
      "Improving tire tread",
      "Reducing liquid surge",
    ],
    correctIndex: 3,
    explanation: "Baffles slow liquid movement inside the tank."
  },
  {
    id: 182,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "The worst surge often happens when the tank is:",
    options: [
      "Carrying only water",
      "Partly full",
      "Completely empty",
      "Completely full",
    ],
    correctIndex: 1,
    explanation: "Partly full tanks allow the most sloshing."
  },
  {
    id: 183,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "When driving a tanker, you should:",
    options: [
      "Make quick lane changes",
      "Follow closely to reduce splash",
      "Drive faster when half-full",
      "Brake and accelerate smoothly",
    ],
    correctIndex: 3,
    explanation: "Smooth control reduces surge effects."
  },
  {
    id: 184,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "In a tanker, stopping distance is usually:",
    options: [
      "The same",
      "Zero",
      "Shorter",
      "Longer than with solid cargo",
    ],
    correctIndex: 3,
    explanation: "Surge can push the vehicle and increase stopping distance."
  },
  {
    id: 185,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "A tank with no baffles:",
    options: [
      "Has less surge",
      "Is always illegal everywhere",
      "Has more surge",
      "Stops faster",
    ],
    correctIndex: 2,
    explanation: "No baffles means the liquid moves more freely."
  },
  {
    id: 186,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "To control surge on a downgrade, you should:",
    options: [
      "Ride the brakes continuously",
      "Coast in neutral",
      "Use a low gear and controlled braking",
      "Turn the wheel quickly",
    ],
    correctIndex: 2,
    explanation: "Low gear and controlled braking reduce sudden weight shifts."
  },
  {
    id: 187,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "The biggest danger with an emergency stop in a tanker is:",
    options: [
      "Instant flat tires",
      "Engine overheating",
      "Surge causing loss of control",
      "Headlight failure",
    ],
    correctIndex: 2,
    explanation: "Sudden stops can shift liquid and destabilize the vehicle."
  },
  {
    id: 188,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "A tanker is often 'top-heavy' because:",
    options: [
      "The engine is strong",
      "It has less weight",
      "It has more gears",
      "Its center of gravity is high",
    ],
    correctIndex: 3,
    explanation: "High center of gravity increases rollover risk."
  },
  {
    id: 189,
    licenseClasses: ["A", "B"],
    endorsements: ["Tanker"],
    category: "Tank Vehicles",
    text: "Before entering a curve in a tanker, you should:",
    options: [
      "Brake hard in the curve",
      "Accelerate hard in the curve",
      "Rely on ABS only",
      "Slow down before the curve",
    ],
    correctIndex: 3,
    explanation: "Speed control before curves prevents rollovers."
  },
  {
    id: 190,
    licenseClasses: ["A"],
    endorsements: ["Doubles/Triples"],
    category: "Doubles/Triples",
    text: "In doubles/triples, the 'crack-the-whip' effect means:",
    options: [
      "The first trailer swings the most",
      "It only happens on ice",
      "The last trailer swings the most",
      "The tractor swings the most",
    ],
    correctIndex: 2,
    explanation: "Rearward amplification makes the last trailer most likely to roll over."
  },
  {
    id: 191,
    licenseClasses: ["A"],
    endorsements: ["Doubles/Triples"],
    category: "Doubles/Triples",
    text: "Compared to a single trailer, doubles require:",
    options: [
      "The same distance",
      "Less following distance",
      "No mirror checks",
      "More following distance",
    ],
    correctIndex: 3,
    explanation: "More length and articulation require more space and time."
  },
  {
    id: 192,
    licenseClasses: ["A"],
    endorsements: ["Doubles/Triples"],
    category: "Doubles/Triples",
    text: "A major danger with doubles is that they are more likely to:",
    options: [
      "Have stronger traction",
      "Stop faster",
      "Never jackknife",
      "Sway and roll over in quick maneuvers",
    ],
    correctIndex: 3,
    explanation: "Multiple articulation points increase sway risk."
  },
  {
    id: 193,
    licenseClasses: ["A"],
    endorsements: ["Doubles/Triples"],
    category: "Doubles/Triples",
    text: "When pulling doubles, you should avoid:",
    options: [
      "Smooth steering",
      "Reducing speed",
      "Sudden lane changes",
      "Checking mirrors",
    ],
    correctIndex: 2,
    explanation: "Sudden moves can start rearward amplification."
  },
  {
    id: 194,
    licenseClasses: ["A"],
    endorsements: ["Doubles/Triples"],
    category: "Doubles/Triples",
    text: "If a trailer in a double set starts to sway, you should:",
    options: [
      "Turn sharply",
      "Accelerate",
      "Brake hard",
      "Slow down gradually and keep steering straight",
    ],
    correctIndex: 3,
    explanation: "Gentle speed reduction helps regain stability."
  },
  {
    id: 195,
    licenseClasses: ["A"],
    endorsements: ["Doubles/Triples"],
    category: "Doubles/Triples",
    text: "When assembling doubles, the safest order is usually to:",
    options: [
      "Couple rear trailer first",
      "Skip inspections",
      "Couple tractor to first trailer, then add the rear trailer",
      "Hook air lines last only",
    ],
    correctIndex: 2,
    explanation: "Build the set from the tractor backward."
  },
  {
    id: 196,
    licenseClasses: ["A"],
    endorsements: ["Doubles/Triples"],
    category: "Doubles/Triples",
    text: "Converter dolly inspection should include:",
    options: [
      "Loose mirrors",
      "High tread only",
      "Secure pintle hook and safety chains",
      "Extra paint",
    ],
    correctIndex: 2,
    explanation: "Dolly connection parts must be secure."
  },
  {
    id: 197,
    licenseClasses: ["A"],
    endorsements: ["Doubles/Triples"],
    category: "Doubles/Triples",
    text: "In triples, the unit most likely to roll over in an evasive maneuver is:",
    options: [
      "None",
      "The first trailer",
      "The last trailer",
      "The tractor",
    ],
    correctIndex: 2,
    explanation: "Rearward amplification makes the last trailer most vulnerable."
  },
  {
    id: 198,
    licenseClasses: ["B", "C"],
    endorsements: ["Passenger"],
    category: "Safety Systems",
    text: "With passengers aboard, you should:",
    options: [
      "Brake and accelerate smoothly",
      "Make sudden starts to keep schedule",
      "Drive with doors open",
      "Allow riders to stand anywhere",
    ],
    correctIndex: 0,
    explanation: "Smooth driving prevents passenger injuries."
  },
  {
    id: 199,
    licenseClasses: ["B", "C"],
    endorsements: ["Passenger"],
    category: "Safety Systems",
    text: "The standee line means:",
    options: [
      "The driver must cross it",
      "Passengers may stand anywhere",
      "Passengers must stand in front of the line",
      "Passengers must not stand in front of the line",
    ],
    correctIndex: 3,
    explanation: "Standing forward of the line can block the driver's view."
  },
  {
    id: 200,
    licenseClasses: ["B", "C"],
    endorsements: ["Passenger"],
    category: "Safety Systems",
    text: "Before moving from a stop, you should:",
    options: [
      "Open the emergency exit",
      "Assume everyone is seated",
      "Be sure doors are closed and passengers are clear",
      "Honk twice and go",
    ],
    correctIndex: 2,
    explanation: "Closed doors and clear aisles reduce falls."
  },
  {
    id: 201,
    licenseClasses: ["B", "C"],
    endorsements: ["Passenger"],
    category: "Safety Systems",
    text: "Emergency exits should be:",
    options: [
      "Locked shut",
      "Used only by the driver",
      "Blocked by luggage",
      "Clearly marked and unobstructed",
    ],
    correctIndex: 3,
    explanation: "Clear exits are critical for evacuation."
  },
  {
    id: 202,
    licenseClasses: ["B", "C"],
    endorsements: ["Passenger"],
    category: "Safety Systems",
    text: "If a passenger becomes unruly, the safest approach is to:",
    options: [
      "Argue while driving",
      "Stop in a safe place and get help if needed",
      "Speed up to end the route",
      "Ignore it completely",
    ],
    correctIndex: 1,
    explanation: "Do not let conflict distract you while driving."
  },
  {
    id: 203,
    licenseClasses: ["B", "C"],
    endorsements: ["Passenger"],
    category: "Safety Systems",
    text: "On passenger vehicles, aisles and exits must be kept:",
    options: [
      "Only clear during inspections",
      "Blocked for extra seating",
      "Clear",
      "Closed to reduce drafts",
    ],
    correctIndex: 2,
    explanation: "Blocked aisles prevent safe evacuation."
  },
  {
    id: 204,
    licenseClasses: ["B", "C"],
    endorsements: ["School Bus"],
    category: "Safety Systems",
    text: "At a railroad crossing, a school bus should typically:",
    options: [
      "Stop on the tracks to check",
      "Use high beams and go",
      "Stop, look, and listen before crossing",
      "Slow down and proceed without stopping",
    ],
    correctIndex: 2,
    explanation: "School buses must stop at most crossings and check for trains."
  },
  {
    id: 205,
    licenseClasses: ["B", "C"],
    endorsements: ["School Bus"],
    category: "Safety Systems",
    text: "The 'danger zone' around a school bus is dangerous because:",
    options: [
      "It is noisy",
      "It has cones",
      "It is too wide",
      "Students may not be visible to the driver",
    ],
    correctIndex: 3,
    explanation: "Blind spots can hide children near the bus."
  },
  {
    id: 206,
    licenseClasses: ["B", "C"],
    endorsements: ["School Bus"],
    category: "Safety Systems",
    text: "When loading/unloading, you should:",
    options: [
      "Wave students through quickly",
      "Rely only on mirrors",
      "Use proper stop procedures and check danger zones",
      "Keep the bus rolling slowly",
    ],
    correctIndex: 2,
    explanation: "Students can be hidden; proper procedures protect them."
  },
  {
    id: 207,
    licenseClasses: ["B", "C"],
    endorsements: ["School Bus"],
    category: "Safety Systems",
    text: "Before leaving a stop, the school bus driver should:",
    options: [
      "Accelerate quickly",
      "Assume students are seated",
      "Ignore mirror checks",
      "Check mirrors and be sure students are safe and accounted for",
    ],
    correctIndex: 3,
    explanation: "Mirror checks confirm students are away from the bus."
  },
  {
    id: 208,
    licenseClasses: ["B", "C"],
    endorsements: ["School Bus"],
    category: "Safety Systems",
    text: "If a student drops something near the bus, you should:",
    options: [
      "Tell them to get it immediately",
      "Let other students help",
      "Keep them out of the danger zone and have them tell you",
      "Ignore it and leave",
    ],
    correctIndex: 2,
    explanation: "Students should never go into blind spots near the bus."
  },
  {
    id: 209,
    licenseClasses: ["B", "C"],
    endorsements: ["School Bus"],
    category: "Safety Systems",
    text: "When the stop arm is out, you should:",
    options: [
      "Let cars pass if they honk",
      "Keep students inside until traffic is stopped as required",
      "Turn off all lights",
      "Drive immediately",
    ],
    correctIndex: 1,
    explanation: "Stop-arm procedure protects students crossing."
  },
  {
    id: 210,
    licenseClasses: ["B", "C"],
    endorsements: ["School Bus"],
    category: "Safety Systems",
    text: "If you must evacuate a school bus, you should:",
    options: [
      "Wait for a tow truck",
      "Keep students inside at all times",
      "Evacuate into traffic",
      "Lead students to a safe place away from traffic",
    ],
    correctIndex: 3,
    explanation: "Move students away from the roadway and hazards."
  }
];
