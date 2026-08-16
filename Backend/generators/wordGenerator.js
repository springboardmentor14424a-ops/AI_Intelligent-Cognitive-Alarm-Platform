// =====================================================
// WORD CHALLENGE GENERATOR
// =====================================================

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}


// =====================================================
// WORD BANK
// =====================================================

const words = [
    "APPLE",
    "PLANET",
    "GARDEN",
    "BRIDGE",
    "MARKET",
    "ORANGE",
    "WINDOW",
    "COMPUTER",
    "ELEPHANT",
    "NOTEBOOK",
    "TEACHER",
    "MOUNTAIN",
    "RAINBOW",
    "HOSPITAL",
    "KEYBOARD",
    "ELEVEN",
    "PYTHON",
    "JOURNEY",
    "LIBRARY",
    "AIRPORT"
];


// =====================================================
// Shuffle Letters
// =====================================================

function shuffleWord(word) {

    let shuffled;

    do {

        shuffled =
            word
                .split("")
                .sort(() => Math.random() - 0.5)
                .join("");

    } while (shuffled === word);

    return shuffled;
}


// =====================================================
// BEGINNER
// =====================================================

function beginnerWord() {

    const word = randomItem([
        "APPLE",
        "GARDEN",
        "PLANET",
        "BRIDGE",
        "MARKET"
    ]);

    const position =
        randomNumber(1, word.length);

    const answer =
        word[position - 1];

    return {

        question:
            `What is the ${position}${getOrdinal(position)} letter ` +
            `of the word "${word}"?`,

        answer,

        explanation:
            `The ${position}${getOrdinal(position)} letter ` +
            `of "${word}" is "${answer}".`

    };
}


// =====================================================
// EASY
// =====================================================

function easyWord() {

    const word = randomItem([
        "ORANGE",
        "WINDOW",
        "TEACHER",
        "RAINBOW",
        "JOURNEY"
    ]);

    const position =
        randomNumber(1, word.length);

    const answer =
        word[position - 1];

    return {

        question:
            `Which letter is at position ${position} ` +
            `in the word "${word}"?`,

        answer,

        explanation:
            `Position ${position} contains the letter "${answer}".`

    };
}


// =====================================================
// MEDIUM
// =====================================================

function mediumWord() {

    const word = randomItem([
        "APPLE",
        "PLANET",
        "BRIDGE",
        "MARKET",
        "PYTHON",
        "LIBRARY"
    ]);

    const scrambled =
        shuffleWord(word);

    return {

        question:
            `Unscramble the letters "${scrambled}" to form a word.`,

        answer:
            word,

        explanation:
            `The letters can be rearranged to form "${word}".`

    };
}


// =====================================================
// HARD
// =====================================================

function hardWord() {

    const word = randomItem([
        "COMPUTER",
        "ELEPHANT",
        "NOTEBOOK",
        "MOUNTAIN",
        "HOSPITAL",
        "KEYBOARD"
    ]);

    const position =
        randomNumber(1, word.length);

    const hiddenLetter =
        word[position - 1];

    const masked =
        word.substring(0, position - 1) +
        "_" +
        word.substring(position);

    return {

        question:
            `Find the missing letter: ${masked}`,

        answer:
            hiddenLetter,

        explanation:
            `The missing letter is "${hiddenLetter}", ` +
            `forming the word "${word}".`

    };
}


// =====================================================
// EXPERT
// =====================================================

function expertWord() {

    const pairs = [

        {
            word1: "HOT",
            word2: "COLD",
            relation: "opposite"
        },

        {
            word1: "BIG",
            word2: "SMALL",
            relation: "opposite"
        },

        {
            word1: "HAPPY",
            word2: "SAD",
            relation: "opposite"
        },

        {
            word1: "FAST",
            word2: "QUICK",
            relation: "similar meaning"
        },

        {
            word1: "SMART",
            word2: "CLEVER",
            relation: "similar meaning"
        }

    ];

    const pair = randomItem(pairs);

    return {

        question:
            `What is the relationship between ` +
            `"${pair.word1}" and "${pair.word2}"?`,

        answer:
            pair.relation,

        explanation:
            `"${pair.word1}" and "${pair.word2}" have a ` +
            `${pair.relation} relationship.`

    };
}


// =====================================================
// Ordinal Helper
// =====================================================

function getOrdinal(number) {

    if (number === 1) return "st";

    if (number === 2) return "nd";

    if (number === 3) return "rd";

    return "th";
}


// =====================================================
// MAIN FUNCTION
// =====================================================

function generateWord(difficulty) {

    switch (difficulty) {

        case "Beginner":
            return beginnerWord();

        case "Easy":
            return easyWord();

        case "Medium":
            return mediumWord();

        case "Hard":
            return hardWord();

        case "Expert":
            return expertWord();

        default:
            throw new Error(
                "Invalid word difficulty."
            );
    }
}


module.exports = {

    generateWord

};