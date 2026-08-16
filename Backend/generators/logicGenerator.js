// =====================================================
// LOGIC CHALLENGE GENERATOR
// =====================================================

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}


// =====================================================
// BEGINNER
// =====================================================

function beginnerLogic() {

    const type = randomNumber(1, 3);

    // Simple number sequence
    if (type === 1) {

        const start = randomNumber(2, 10);
        const step = randomNumber(1, 5);

        const numbers = [
            start,
            start + step,
            start + step * 2,
            start + step * 3
        ];

        const answer = start + step * 4;

        return {
            question:
                `What number comes next: ${numbers.join(", ")}, ?`,
            answer: String(answer),
            explanation:
                `The numbers increase by ${step} each time.`
        };
    }


    // Odd one out
    if (type === 2) {

        const even1 = randomNumber(2, 20) * 2;
        const even2 = randomNumber(2, 20) * 2;
        const even3 = randomNumber(2, 20) * 2;
        const odd = randomNumber(1, 20) * 2 + 1;

        const values = [even1, even2, odd, even3];

        return {
            question:
                `Which number does not belong: ${values.join(", ")}?`,
            answer: String(odd),
            explanation:
                `${odd} is odd, while the other numbers are even.`
        };
    }


    // Simple comparison
    const a = randomNumber(10, 50);
    const b = randomNumber(10, 50);

    const answer = Math.max(a, b);

    return {
        question:
            `Which is larger: ${a} or ${b}?`,
        answer: String(answer),
        explanation:
            `${answer} is larger than the other number.`
    };
}


// =====================================================
// EASY
// =====================================================

function easyLogic() {

    const type = randomNumber(1, 3);

    // Multiplication sequence
    if (type === 1) {

        const start = randomNumber(2, 5);
        const multiplier = randomNumber(2, 3);

        const numbers = [
            start,
            start * multiplier,
            start * multiplier ** 2,
            start * multiplier ** 3
        ];

        const answer =
            start * multiplier ** 4;

        return {
            question:
                `What number comes next: ${numbers.join(", ")}, ?`,
            answer: String(answer),
            explanation:
                `Each number is multiplied by ${multiplier}.`
        };
    }


    // Missing number
    if (type === 2) {

        const a = randomNumber(5, 15);
        const b = randomNumber(5, 15);
        const answer = a + b;

        return {
            question:
                `If ${a} + ? = ${answer}, what is the missing number?`,
            answer: String(b),
            explanation:
                `${answer} - ${a} = ${b}.`
        };
    }


    // Ordering
    const values = [
        randomNumber(10, 30),
        randomNumber(31, 50),
        randomNumber(51, 70)
    ];

    return {
        question:
            `Arrange these numbers from smallest to largest: ` +
            `${values[2]}, ${values[0]}, ${values[1]}.`,
        answer:
            values.sort((a, b) => a - b).join(", "),
        explanation:
            "Compare the values and arrange them in ascending order."
    };
}


// =====================================================
// MEDIUM
// =====================================================

function mediumLogic() {

    const type = randomNumber(1, 3);


    // Alternating sequence
    if (type === 1) {

        const start = randomNumber(2, 10);
        const add = randomNumber(2, 5);
        const subtract = randomNumber(1, 3);

        const second = start + add;
        const third = second - subtract;
        const fourth = third + add;
        const fifth = fourth - subtract;

        const answer = fifth + add;

        return {
            question:
                `What number comes next: ` +
                `${start}, ${second}, ${third}, ${fourth}, ${fifth}, ?`,
            answer: String(answer),
            explanation:
                `The pattern alternates between +${add} and -${subtract}.`
        };
    }


    // Conditional logic
    if (type === 2) {

        const red = randomNumber(5, 15);
        const blue = randomNumber(5, 15);

        return {
            question:
                `A box contains ${red} red balls and ${blue} blue balls. ` +
                `If one red ball is removed, how many red balls remain?`,
            answer: String(red - 1),
            explanation:
                `${red} - 1 = ${red - 1}.`
        };
    }


    // Comparison reasoning
    const a = randomNumber(20, 50);
    const b = randomNumber(10, 19);
    const c = randomNumber(5, 9);

    const answer = a - b + c;

    return {
        question:
            `Start with ${a}. Subtract ${b}, then add ${c}. What is the result?`,
        answer: String(answer),
        explanation:
            `${a} - ${b} = ${a - b}; ` +
            `${a - b} + ${c} = ${answer}.`
    };
}


// =====================================================
// HARD
// =====================================================

function hardLogic() {

    const type = randomNumber(1, 3);


    // Complex sequence
    if (type === 1) {

        const start = randomNumber(2, 6);

        const a = start;
        const b = a * 2 + 1;
        const c = b * 2 + 1;
        const d = c * 2 + 1;

        const answer = d * 2 + 1;

        return {
            question:
                `Find the next number: ${a}, ${b}, ${c}, ${d}, ?`,
            answer: String(answer),
            explanation:
                "Each number is multiplied by 2 and then increased by 1."
        };
    }


    // Multi-step reasoning
    if (type === 2) {

        const initial = randomNumber(20, 50);
        const removed = randomNumber(5, 15);
        const added = randomNumber(10, 20);

        const answer = initial - removed + added;

        return {
            question:
                `A number starts at ${initial}. ` +
                `${removed} is subtracted and then ${added} is added. ` +
                `What is the final value?`,
            answer: String(answer),
            explanation:
                `${initial} - ${removed} = ${initial - removed}; ` +
                `${initial - removed} + ${added} = ${answer}.`
        };
    }


    // Age reasoning
    const age = randomNumber(18, 30);
    const difference = randomNumber(5, 12);

    const answer = age + difference;

    return {
        question:
            `Ravi is ${age} years old. ` +
            `His brother is ${difference} years older. ` +
            `How old is his brother?`,
        answer: String(answer),
        explanation:
            `${age} + ${difference} = ${answer}.`
    };
}


// =====================================================
// EXPERT
// =====================================================

function expertLogic() {

    const type = randomNumber(1, 3);


    // Advanced sequence
    if (type === 1) {

        const start = randomNumber(2, 5);

        const a = start;
        const b = a * 2;
        const c = b + 3;
        const d = c * 2;
        const e = d + 3;

        const answer = e * 2;

        return {
            question:
                `Find the next number: ${a}, ${b}, ${c}, ${d}, ${e}, ?`,
            answer: String(answer),
            explanation:
                "The pattern alternates between multiplying by 2 and adding 3."
        };
    }


    // Multiple conditions
    if (type === 2) {

        const a = randomNumber(10, 30);
        const b = randomNumber(2, 8);

        const result = (a + b) * 2;

        return {
            question:
                `A number ${a} is increased by ${b}. ` +
                `The result is then doubled. What is the final value?`,
            answer: String(result),
            explanation:
                `First ${a} + ${b} = ${a + b}. ` +
                `Then ${a + b} × 2 = ${result}.`
        };
    }


    // Advanced comparison
    const a = randomNumber(20, 40);
    const b = randomNumber(10, 20);
    const c = randomNumber(5, 15);

    const answer = (a - b) * c;

    return {
        question:
            `Take ${a}, subtract ${b}, and multiply the result by ${c}. ` +
            `What is the answer?`,
        answer: String(answer),
        explanation:
            `First ${a} - ${b} = ${a - b}. ` +
            `Then ${a - b} × ${c} = ${answer}.`
    };
}


// =====================================================
// MAIN FUNCTION
// =====================================================

function generateLogic(difficulty) {

    switch (difficulty) {

        case "Beginner":
            return beginnerLogic();

        case "Easy":
            return easyLogic();

        case "Medium":
            return mediumLogic();

        case "Hard":
            return hardLogic();

        case "Expert":
            return expertLogic();

        default:
            throw new Error("Invalid logic difficulty.");
    }
}


module.exports = {
    generateLogic
};