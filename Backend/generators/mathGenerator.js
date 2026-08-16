// =====================================================
// MATH CHALLENGE GENERATOR
// Generates different questions based on difficulty
// =====================================================

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMath(difficulty) {

    let question;
    let answer;
    let explanation;

    switch (difficulty) {

        // =============================================
        // BEGINNER
        // =============================================
        case "Beginner": {

            const a = randomNumber(1, 20);
            const b = randomNumber(1, 20);

            answer = a + b;

            question = `What is ${a} + ${b}?`;

            explanation = `${a} + ${b} = ${answer}`;

            break;
        }


        // =============================================
        // EASY
        // =============================================
        case "Easy": {

            const a = randomNumber(20, 80);
            const b = randomNumber(5, 30);

            answer = a - b;

            question = `What is ${a} - ${b}?`;

            explanation = `${a} - ${b} = ${answer}`;

            break;
        }


        // =============================================
        // MEDIUM
        // =============================================
        case "Medium": {

            const a = randomNumber(5, 20);
            const b = randomNumber(3, 12);

            answer = a * b;

            question = `What is ${a} × ${b}?`;

            explanation = `${a} × ${b} = ${answer}`;

            break;
        }


        // =============================================
        // HARD
        // =============================================
        case "Hard": {

            const a = randomNumber(5, 20);
            const b = randomNumber(2, 10);
            const c = randomNumber(5, 30);

            answer = (a * b) + c;

            question = `Calculate (${a} × ${b}) + ${c}.`;

            explanation =
                `First, ${a} × ${b} = ${a * b}. ` +
                `Then, ${a * b} + ${c} = ${answer}.`;

            break;
        }


        // =============================================
        // EXPERT
        // =============================================
        case "Expert": {

            const a = randomNumber(5, 20);
            const b = randomNumber(2, 8);
            const c = randomNumber(2, 10);
            const d = randomNumber(5, 20);

            answer = (a + b) * c - d;

            question =
                `Calculate (${a} + ${b}) × ${c} - ${d}.`;

            explanation =
                `First, ${a} + ${b} = ${a + b}. ` +
                `Then, ${a + b} × ${c} = ${(a + b) * c}. ` +
                `Finally, ${(a + b) * c} - ${d} = ${answer}.`;

            break;
        }


        default:

            throw new Error(
                "Invalid math difficulty."
            );
    }


    return {
        question,
        answer: String(answer),
        explanation
    };
}


module.exports = {
    generateMath
};