export type ChallengeType = 'math' | 'logic' | 'memory' | 'word' | 'pattern' | 'riddle' | 'quiz';
export type ChallengeDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export interface GeneratedChallenge {
  id: string;
  challengeType: ChallengeType;
  difficulty: ChallengeDifficulty;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  createdAt: string;
}

// Utility for random integer generation within inclusive range
const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Shuffle array
const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// ==========================================
// 1. MATH GENERATOR
// ==========================================
const generateMathChallenge = (difficulty: ChallengeDifficulty): GeneratedChallenge => {
  let question = '';
  let correctAnswer = '';
  let explanation = '';
  let options: string[] = [];

  switch (difficulty) {
    case 'beginner': {
      const a = getRandomInt(1, 15);
      const b = getRandomInt(1, 15);
      const isAdd = Math.random() > 0.4;
      if (isAdd) {
        question = `What is ${a} + ${b}?`;
        correctAnswer = (a + b).toString();
        explanation = `${a} plus ${b} equals ${a + b}.`;
      } else {
        const sum = a + b;
        question = `What is ${sum} - ${a}?`;
        correctAnswer = b.toString();
        explanation = `${sum} minus ${a} equals ${b}.`;
      }
      break;
    }

    case 'easy': {
      const type = getRandomInt(1, 3);
      if (type === 1) {
        const a = getRandomInt(12, 55);
        const b = getRandomInt(11, 45);
        question = `What is ${a} + ${b}?`;
        correctAnswer = (a + b).toString();
        explanation = `${a} + ${b} = ${a + b}.`;
      } else if (type === 2) {
        const a = getRandomInt(3, 12);
        const b = getRandomInt(3, 9);
        question = `What is ${a} × ${b}?`;
        correctAnswer = (a * b).toString();
        explanation = `${a} multiplied by ${b} equals ${a * b}.`;
      } else {
        const b = getRandomInt(2, 9);
        const ans = getRandomInt(4, 12);
        const a = ans * b;
        question = `What is ${a} ÷ ${b}?`;
        correctAnswer = ans.toString();
        explanation = `${a} divided by ${b} equals ${ans}.`;
      }
      break;
    }

    case 'medium': {
      const type = getRandomInt(1, 3);
      if (type === 1) {
        const a = getRandomInt(12, 25);
        const b = getRandomInt(4, 12);
        const c = getRandomInt(5, 30);
        question = `Solve: ${a} × ${b} + ${c}`;
        correctAnswer = (a * b + c).toString();
        explanation = `First multiply ${a} × ${b} = ${a * b}, then add ${c} = ${a * b + c}.`;
      } else if (type === 2) {
        const x = getRandomInt(3, 15);
        const coef = getRandomInt(2, 6);
        const constant = getRandomInt(4, 25);
        const rhs = coef * x + constant;
        question = `Solve for x: ${coef}x + ${constant} = ${rhs}`;
        correctAnswer = x.toString();
        explanation = `Subtract ${constant} from ${rhs} to get ${rhs - constant}, then divide by ${coef} to get x = ${x}.`;
      } else {
        const a = getRandomInt(100, 350);
        const b = getRandomInt(45, 150);
        question = `What is ${a} - ${b}?`;
        correctAnswer = (a - b).toString();
        explanation = `${a} minus ${b} equals ${a - b}.`;
      }
      break;
    }

    case 'hard': {
      const type = getRandomInt(1, 2);
      if (type === 1) {
        const x = getRandomInt(4, 16);
        const coef = getRandomInt(3, 8);
        const constant = getRandomInt(15, 60);
        const rhs = coef * x - constant;
        question = `Solve for x: ${coef}x - ${constant} = ${rhs}`;
        correctAnswer = x.toString();
        explanation = `Add ${constant} to ${rhs} to get ${rhs + constant}, then divide by ${coef} to get x = ${x}.`;
      } else {
        const a = getRandomInt(14, 28);
        const b = getRandomInt(12, 22);
        question = `What is ${a} × ${b}?`;
        correctAnswer = (a * b).toString();
        explanation = `${a} × ${b} = ${a * b}.`;
      }
      break;
    }

    case 'expert':
    default: {
      const x = getRandomInt(5, 12);
      const k = getRandomInt(2, 5);
      const val = k * x * x;
      question = `Solve for x (positive value): ${k}x² = ${val}`;
      correctAnswer = x.toString();
      explanation = `Divide ${val} by ${k} to get x² = ${x * x}, so x = ${x}.`;
      break;
    }
  }

  // Generate 4 multiple-choice options including correct answer
  const numAns = parseInt(correctAnswer, 10);
  if (!isNaN(numAns)) {
    const distractors = new Set<string>();
    distractors.add(correctAnswer);
    let attempts = 0;
    while (distractors.size < 4 && attempts < 20) {
      attempts++;
      const delta = getRandomInt(1, 5) * (Math.random() > 0.5 ? 1 : -1);
      const val = numAns + delta;
      if (val >= 0) distractors.add(val.toString());
    }
    options = shuffle(Array.from(distractors));
  }

  return {
    id: `dyn_math_${Date.now()}_${getRandomInt(100, 999)}`,
    challengeType: 'math',
    difficulty,
    question,
    options,
    correctAnswer,
    explanation,
    createdAt: new Date().toISOString(),
  };
};

// ==========================================
// 2. LOGIC GENERATOR
// ==========================================
const generateLogicChallenge = (difficulty: ChallengeDifficulty): GeneratedChallenge => {
  const logicBank = [
    {
      difficulty: 'beginner',
      question: 'Which number completes the sequence? 2, 4, 6, 8, [?]',
      options: ['10', '12', '9', '14'],
      correctAnswer: '10',
      explanation: 'The sequence increases by 2 each time (+2).',
    },
    {
      difficulty: 'beginner',
      question: 'Which is the odd one out among these shapes?',
      options: ['Circle', 'Square', 'Triangle', 'Pentagon'],
      correctAnswer: 'Circle',
      explanation: 'A circle has no straight edges or vertices, unlike polygons.',
    },
    {
      difficulty: 'easy',
      question: 'What comes next in the letter sequence? A, C, E, G, [?]',
      options: ['I', 'H', 'J', 'K'],
      correctAnswer: 'I',
      explanation: 'Letters skip one position in the alphabet: A(+2)C(+2)E(+2)G(+2)I.',
    },
    {
      difficulty: 'easy',
      question: 'Find the odd number out: 4, 8, 12, 15, 20',
      options: ['15', '4', '12', '20'],
      correctAnswer: '15',
      explanation: '15 is an odd number and not divisible by 4, whereas all others are multiples of 4.',
    },
    {
      difficulty: 'medium',
      question: 'Which number comes next? 3, 6, 12, 24, [?]',
      options: ['48', '36', '42', '50'],
      correctAnswer: '48',
      explanation: 'Each number is multiplied by 2 (doubled) to get the next term.',
    },
    {
      difficulty: 'medium',
      question: 'If ALL roses are flowers and ALL flowers need water, then ALL roses need water. Is this statement valid?',
      options: ['Yes, Logically Valid', 'No, Invalid', 'Cannot be determined', 'Only in summer'],
      correctAnswer: 'Yes, Logically Valid',
      explanation: 'This is a valid transitive syllogism (If A ⊂ B and B ⊂ C, then A ⊂ C).',
    },
    {
      difficulty: 'hard',
      question: 'Find the missing number in sequence: 1, 4, 9, 16, 25, [?]',
      options: ['36', '30', '35', '49'],
      correctAnswer: '36',
      explanation: 'The sequence consists of perfect squares: 1², 2², 3², 4², 5², 6² = 36.',
    },
    {
      difficulty: 'hard',
      question: 'If 5 cats can catch 5 mice in 5 minutes, how many cats are needed to catch 100 mice in 100 minutes?',
      options: ['5', '100', '20', '50'],
      correctAnswer: '5',
      explanation: '1 cat catches 1 mouse in 5 minutes. In 100 minutes, 1 cat can catch 20 mice. Thus, 5 cats can catch 5 x 20 = 100 mice.',
    },
    {
      difficulty: 'expert',
      question: 'What is the next number in Fibonacci sequence? 1, 1, 2, 3, 5, 8, 13, [?]',
      options: ['21', '20', '18', '26'],
      correctAnswer: '21',
      explanation: 'Each term is the sum of the preceding two terms: 8 + 13 = 21.',
    },
    {
      difficulty: 'expert',
      question: 'A clock shows 3:15. What is the acute angle between the hour hand and the minute hand?',
      options: ['7.5°', '0°', '15°', '30°'],
      correctAnswer: '7.5°',
      explanation: 'At 3:15, minute hand is at 90°. Hour hand has moved 15 minutes past 3 (15 x 0.5° = 7.5° past 90°), so angle is 7.5°.',
    },
  ];

  const pool = logicBank.filter((item) => item.difficulty === difficulty);
  const selected = pool.length > 0 ? pool[getRandomInt(0, pool.length - 1)] : logicBank[0];

  return {
    id: `dyn_logic_${Date.now()}_${getRandomInt(100, 999)}`,
    challengeType: 'logic',
    difficulty: selected.difficulty as ChallengeDifficulty,
    question: selected.question,
    options: shuffle(selected.options),
    correctAnswer: selected.correctAnswer,
    explanation: selected.explanation,
    createdAt: new Date().toISOString(),
  };
};

// ==========================================
// 3. MEMORY GENERATOR
// ==========================================
const generateMemoryChallenge = (difficulty: ChallengeDifficulty): GeneratedChallenge => {
  let seqLength = 4;
  if (difficulty === 'easy') seqLength = 5;
  if (difficulty === 'medium') seqLength = 6;
  if (difficulty === 'hard') seqLength = 7;
  if (difficulty === 'expert') seqLength = 9;

  const digits: number[] = [];
  for (let i = 0; i < seqLength; i++) {
    digits.push(getRandomInt(1, 9));
  }
  const sequenceStr = digits.join(' - ');
  const correctAnswer = digits.join('');

  const distractors = new Set<string>();
  distractors.add(correctAnswer);
  while (distractors.size < 4) {
    const fakeDigits = [...digits];
    const swapIdx = getRandomInt(0, fakeDigits.length - 1);
    fakeDigits[swapIdx] = getRandomInt(1, 9);
    distractors.add(fakeDigits.join(''));
  }

  return {
    id: `dyn_mem_${Date.now()}_${getRandomInt(100, 999)}`,
    challengeType: 'memory',
    difficulty,
    question: `Memorize this number sequence carefully: [ ${sequenceStr} ]. What is the exact sequence in order?`,
    options: shuffle(Array.from(distractors)),
    correctAnswer,
    explanation: `The sequence to memorize was ${sequenceStr} (${correctAnswer}).`,
    createdAt: new Date().toISOString(),
  };
};

// ==========================================
// 4. WORD GENERATOR
// ==========================================
const generateWordChallenge = (difficulty: ChallengeDifficulty): GeneratedChallenge => {
  const wordBank = [
    {
      difficulty: 'beginner',
      question: 'Unscramble the word: W A K E',
      options: ['WAKE', 'WEAK', 'WAVE', 'WALK'],
      correctAnswer: 'WAKE',
      explanation: 'W-A-K-E forms the word WAKE.',
    },
    {
      difficulty: 'beginner',
      question: 'What is the opposite (antonym) of SLOW?',
      options: ['FAST', 'CALM', 'LATE', 'SOFT'],
      correctAnswer: 'FAST',
      explanation: 'The opposite of slow is fast.',
    },
    {
      difficulty: 'easy',
      question: 'Unscramble this alertness word: B R A I N',
      options: ['BRAIN', 'TRAIN', 'GRAIN', 'DRAIN'],
      correctAnswer: 'BRAIN',
      explanation: 'B-R-A-I-N spells BRAIN.',
    },
    {
      difficulty: 'easy',
      question: 'Which word means the same as "FOCUS"?',
      options: ['Concentration', 'Distraction', 'Confusion', 'Rest'],
      correctAnswer: 'Concentration',
      explanation: 'Focus is synonymous with concentration.',
    },
    {
      difficulty: 'medium',
      question: 'Unscramble this morning cognitive word: A L E R T N E S S',
      options: ['ALERTNESS', 'ALTERNESS', 'EARNESTNESS', 'CLEVERNESS'],
      correctAnswer: 'ALERTNESS',
      explanation: 'A-L-E-R-T-N-E-S-S spells ALERTNESS.',
    },
    {
      difficulty: 'medium',
      question: 'Select the synonym for "VIGILANT":',
      options: ['Watchful', 'Careless', 'Drowsy', 'Passive'],
      correctAnswer: 'Watchful',
      explanation: 'Vigilant means staying keenly watchful for potential danger or difficulties.',
    },
    {
      difficulty: 'hard',
      question: 'Unscramble this word: C O G N I T I V E',
      options: ['COGNITIVE', 'IGNITIVE', 'INCUBATIVE', 'RECOGNITIVE'],
      correctAnswer: 'COGNITIVE',
      explanation: 'C-O-G-N-I-T-I-V-E spells COGNITIVE.',
    },
    {
      difficulty: 'hard',
      question: 'Which word describes "a state of deep mental alertness"?',
      options: ['Lucidity', 'Lethargy', 'Stupor', 'Apathy'],
      correctAnswer: 'Lucidity',
      explanation: 'Lucidity represents clarity of mind and active alertness.',
    },
    {
      difficulty: 'expert',
      question: 'What is the antonym of "SOMNOLENT"?',
      options: ['Energetic / Wide Awake', 'Sleepy', 'Drowsy', 'Hypnotic'],
      correctAnswer: 'Energetic / Wide Awake',
      explanation: 'Somnolent means abnormally sleepy or drowsy, so its antonym is energetic and wide awake.',
    },
  ];

  const pool = wordBank.filter((w) => w.difficulty === difficulty);
  const selected = pool.length > 0 ? pool[getRandomInt(0, pool.length - 1)] : wordBank[0];

  return {
    id: `dyn_word_${Date.now()}_${getRandomInt(100, 999)}`,
    challengeType: 'word',
    difficulty: selected.difficulty as ChallengeDifficulty,
    question: selected.question,
    options: shuffle(selected.options),
    correctAnswer: selected.correctAnswer,
    explanation: selected.explanation,
    createdAt: new Date().toISOString(),
  };
};

// ==========================================
// 5. PATTERN GENERATOR
// ==========================================
const generatePatternChallenge = (difficulty: ChallengeDifficulty): GeneratedChallenge => {
  const patternBank = [
    {
      difficulty: 'beginner',
      question: 'Which symbol comes next? ▲, ■, ▲, ■, ▲, [?]',
      options: ['■', '▲', '●', '★'],
      correctAnswer: '■',
      explanation: 'The pattern alternates between triangle (▲) and square (■).',
    },
    {
      difficulty: 'easy',
      question: 'Identify the next step in the number pattern: 5, 10, 15, 20, [?]',
      options: ['25', '30', '22', '35'],
      correctAnswer: '25',
      explanation: 'The pattern adds 5 at each step (+5).',
    },
    {
      difficulty: 'medium',
      question: 'What comes next in the geometric pattern? 1 circle, 2 triangles, 3 squares, 4 [?]',
      options: ['Pentagons', 'Circles', 'Hexagons', 'Lines'],
      correctAnswer: 'Pentagons',
      explanation: 'The shapes increase their number of sides from 3 (triangle) to 4 (square) to 5 (pentagon).',
    },
    {
      difficulty: 'hard',
      question: 'Complete the pattern: 3, 5, 9, 17, 33, [?]',
      options: ['65', '49', '64', '58'],
      correctAnswer: '65',
      explanation: 'The difference between numbers doubles each time: +2, +4, +8, +16, +32 (33 + 32 = 65).',
    },
    {
      difficulty: 'expert',
      question: 'Determine the missing matrix number:\n[ 2  4  8 ]\n[ 3  9  27 ]\n[ 4 16  ? ]',
      options: ['64', '32', '48', '80'],
      correctAnswer: '64',
      explanation: 'Each row follows n, n², n³: 4, 4²=16, 4³=64.',
    },
  ];

  const pool = patternBank.filter((p) => p.difficulty === difficulty);
  const selected = pool.length > 0 ? pool[getRandomInt(0, pool.length - 1)] : patternBank[0];

  return {
    id: `dyn_pat_${Date.now()}_${getRandomInt(100, 999)}`,
    challengeType: 'pattern',
    difficulty: selected.difficulty as ChallengeDifficulty,
    question: selected.question,
    options: shuffle(selected.options),
    correctAnswer: selected.correctAnswer,
    explanation: selected.explanation,
    createdAt: new Date().toISOString(),
  };
};

// ==========================================
// 6. RIDDLE GENERATOR
// ==========================================
const generateRiddleChallenge = (difficulty: ChallengeDifficulty): GeneratedChallenge => {
  const riddleBank = [
    {
      difficulty: 'beginner',
      question: 'I have hands but cannot clap, and I wake you up in the morning. What am I?',
      options: ['A Clock / Alarm', 'A Bell', 'A Mirror', 'A Rooster'],
      correctAnswer: 'A Clock / Alarm',
      explanation: 'A clock has hands to point at time and sounds an alarm to awaken you.',
    },
    {
      difficulty: 'easy',
      question: 'What belongs to you, but other people use it more than you do?',
      options: ['Your Name', 'Your Phone', 'Your Car', 'Your Shoes'],
      correctAnswer: 'Your Name',
      explanation: 'People call your name far more often than you say it yourself.',
    },
    {
      difficulty: 'medium',
      question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?',
      options: ['An Echo', 'A Cloud', 'A Shadow', 'A Whisper'],
      correctAnswer: 'An Echo',
      explanation: 'An echo repeats sound back across space through sound waves.',
    },
    {
      difficulty: 'hard',
      question: 'The more of this there is, the less you see. What is it?',
      options: ['Darkness', 'Fog', 'Light', 'Silence'],
      correctAnswer: 'Darkness',
      explanation: 'As darkness increases, visibility decreases.',
    },
    {
      difficulty: 'expert',
      question: 'I am light as a feather, yet the strongest person cannot hold me for much more than two minutes. What am I?',
      options: ['Your Breath', 'A Secret', 'A Bubble', 'A Thought'],
      correctAnswer: 'Your Breath',
      explanation: 'Holding your breath requires intense physical restraint despite breath having virtually no weight.',
    },
  ];

  const pool = riddleBank.filter((r) => r.difficulty === difficulty);
  const selected = pool.length > 0 ? pool[getRandomInt(0, pool.length - 1)] : riddleBank[0];

  return {
    id: `dyn_rid_${Date.now()}_${getRandomInt(100, 999)}`,
    challengeType: 'riddle',
    difficulty: selected.difficulty as ChallengeDifficulty,
    question: selected.question,
    options: shuffle(selected.options),
    correctAnswer: selected.correctAnswer,
    explanation: selected.explanation,
    createdAt: new Date().toISOString(),
  };
};

// ==========================================
// 7. QUICK QUIZ GENERATOR
// ==========================================
const generateQuizChallenge = (difficulty: ChallengeDifficulty): GeneratedChallenge => {
  const quizBank = [
    {
      difficulty: 'beginner',
      question: 'Which organ in the human body consumes approximately 20% of the body energy?',
      options: ['Brain', 'Heart', 'Liver', 'Lungs'],
      correctAnswer: 'Brain',
      explanation: 'The human brain consumes about 20% of resting metabolic energy.',
    },
    {
      difficulty: 'easy',
      question: 'What is the recommended average nightly sleep duration for optimal cognitive performance in adults?',
      options: ['7 to 9 Hours', '4 to 5 Hours', '10 to 12 Hours', '6 Hours exact'],
      correctAnswer: '7 to 9 Hours',
      explanation: 'Sleep research consistently shows adults need 7-9 hours of restorative sleep.',
    },
    {
      difficulty: 'medium',
      question: 'Which chemical in the brain is primarily associated with morning alertness and circadian regulation?',
      options: ['Cortisol', 'Melatonin', 'Dopamine', 'Insulin'],
      correctAnswer: 'Cortisol',
      explanation: 'The Cortisol Awakening Response (CAR) naturally spikes in the morning to promote wakefulness.',
    },
    {
      difficulty: 'hard',
      question: 'What phenomenon causes temporary grogginess and reduced mental dexterity immediately upon waking?',
      options: ['Sleep Inertia', 'Circadian Phase Shift', 'REM Rebound', 'Adenosine Surge'],
      correctAnswer: 'Sleep Inertia',
      explanation: 'Sleep inertia is the physiological state of impaired cognitive performance present immediately after waking.',
    },
    {
      difficulty: 'expert',
      question: 'Which region of the brain functions as the master circadian pacemaker in mammals?',
      options: ['Suprachiasmatic Nucleus (SCN)', 'Prefrontal Cortex', 'Hippocampus', 'Amygdala'],
      correctAnswer: 'Suprachiasmatic Nucleus (SCN)',
      explanation: 'The SCN in the hypothalamus regulates circadian rhythms in response to light exposure.',
    },
  ];

  const pool = quizBank.filter((q) => q.difficulty === difficulty);
  const selected = pool.length > 0 ? pool[getRandomInt(0, pool.length - 1)] : quizBank[0];

  return {
    id: `dyn_quiz_${Date.now()}_${getRandomInt(100, 999)}`,
    challengeType: 'quiz',
    difficulty: selected.difficulty as ChallengeDifficulty,
    question: selected.question,
    options: shuffle(selected.options),
    correctAnswer: selected.correctAnswer,
    explanation: selected.explanation,
    createdAt: new Date().toISOString(),
  };
};

// ==========================================
// MASTER CHALLENGE ENGINE GENERATOR
// ==========================================
export const generateChallenge = (
  type: ChallengeType = 'math',
  difficulty: ChallengeDifficulty = 'medium'
): GeneratedChallenge => {
  const normType = (type || 'math').toLowerCase() as ChallengeType;
  const normDiff = (difficulty || 'medium').toLowerCase() as ChallengeDifficulty;

  switch (normType) {
    case 'math':
      return generateMathChallenge(normDiff);
    case 'logic':
      return generateLogicChallenge(normDiff);
    case 'memory':
      return generateMemoryChallenge(normDiff);
    case 'word':
      return generateWordChallenge(normDiff);
    case 'pattern':
      return generatePatternChallenge(normDiff);
    case 'riddle':
      return generateRiddleChallenge(normDiff);
    case 'quiz':
      return generateQuizChallenge(normDiff);
    default:
      return generateMathChallenge(normDiff);
  }
};
