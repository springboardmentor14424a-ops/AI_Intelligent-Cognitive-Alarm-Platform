// =====================================================
// PATTERN RECOGNITION CHALLENGE GENERATOR
// =====================================================

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}


// =====================================================
// BEGINNER
// Simple increasing pattern
// =====================================================

function beginnerPattern() {

    const start = randomNumber(1, 10);
    const step = randomNumber(1, 5);

    const sequence = [
        start,
        start + step,
        start + step * 2,
        start + step * 3
    ];

    const answer = start + step * 4;

    return {

        question:
            `Find the next number: ${sequence.join(", ")}, ?`,

        answer: String(answer),

        explanation:
            `The pattern increases by ${step} each time.`
    };
}


// =====================================================
// EASY
// Multiplication pattern
// =====================================================

function easyPattern() {

    const start = randomNumber(2, 5);
    const multiplier = randomNumber(2, 3);

    const sequence = [
        start,
        start * multiplier,
        start * multiplier ** 2,
        start * multiplier ** 3
    ];

    const answer =
        start * multiplier ** 4;

    return {

        question:
            `Find the next number: ${sequence.join(", ")}, ?`,

        answer: String(answer),

        explanation:
            `Each number is multiplied by ${multiplier}.`
    };
}


// =====================================================
// MEDIUM
// Difference pattern
// =====================================================

function mediumPattern() {

    const start = randomNumber(2, 10);

    const difference1 = randomNumber(2, 5);
    const difference2 = difference1 + randomNumber(1, 3);

    const a = start;
    const b = a + difference1;
    const c = b + difference2;
    const d = c + difference1;
    const e = d + difference2;

    const answer = e + difference1;

    return {

        question:
            `Find the next number: ` +
            `${a}, ${b}, ${c}, ${d}, ${e}, ?`,

        answer: String(answer),

        explanation:
            `The pattern alternates between adding ` +
            `${difference1} and ${difference2}.`
    };
}


// =====================================================
// HARD
// Square-number pattern
// =====================================================

function hardPattern() {

    const start = randomNumber(1, 4);

    const sequence = [
        start ** 2,
        (start + 1) ** 2,
        (start + 2) ** 2,
        (start + 3) ** 2
    ];

    const answer =
        (start + 4) ** 2;

    return {

        question:
            `Identify the next number: ` +
            `${sequence.join(", ")}, ?`,

        answer: String(answer),

        explanation:
            `These are consecutive square numbers. ` +
            `The next value is ${start + 4}² = ${answer}.`
    };
}


// =====================================================
// EXPERT
// Mixed-operation pattern
// =====================================================

function expertPattern() {

    const start = randomNumber(2, 6);

    const a = start;
    const b = a * 2;
    const c = b + 4;
    const d = c * 2;
    const e = d + 4;
    const f = e * 2;

    const answer = f + 4;

    return {

        question:
            `Find the next number: ` +
            `${a}, ${b}, ${c}, ${d}, ${e}, ${f}, ?`,

        answer: String(answer),

        explanation:
            `The pattern alternates between ×2 and +4.`
    };
}


// =====================================================
// MAIN FUNCTION
// =====================================================

function generatePattern(difficulty) {

    switch (difficulty) {

        case "Beginner":
            return beginnerPattern();

        case "Easy":
            return easyPattern();

        case "Medium":
            return mediumPattern();

        case "Hard":
            return hardPattern();

        case "Expert":
            return expertPattern();

        default:
            throw new Error(
                "Invalid pattern difficulty."
            );
    }
}


module.exports = {

    generatePattern

};