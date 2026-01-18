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
  }
];
