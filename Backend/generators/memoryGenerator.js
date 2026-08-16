// =====================================================
// MEMORY CHALLENGE GENERATOR
// =====================================================

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomLetter() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return letters[randomNumber(0, letters.length - 1)];
}


// =====================================================
// Generate Number Sequence
// =====================================================

function generateNumberSequence(length) {

    const sequence = [];

    for (let i = 0; i < length; i++) {
        sequence.push(randomNumber(0, 9));
    }

    return sequence;
}


// =====================================================
// Generate Letter Sequence
// =====================================================

function generateLetterSequence(length) {

    const sequence = [];

    for (let i = 0; i < length; i++) {
        sequence.push(randomLetter());
    }

    return sequence;
}


// =====================================================
// Generate Mixed Sequence
// =====================================================

function generateMixedSequence(length) {

    const sequence = [];

    for (let i = 0; i < length; i++) {

        if (Math.random() < 0.5) {
            sequence.push(String(randomNumber(0, 9)));
        } else {
            sequence.push(randomLetter());
        }
    }

    return sequence;
}


// =====================================================
// MAIN MEMORY GENERATOR
// =====================================================

function generateMemory(difficulty) {

    let length;
    let sequenceType;
    let sequence;


    switch (difficulty) {

        // ---------------------------------------------
        // BEGINNER
        // ---------------------------------------------

        case "Beginner":

            length = 4;

            sequence = generateNumberSequence(length);

            sequenceType = "numbers";

            break;


        // ---------------------------------------------
        // EASY
        // ---------------------------------------------

        case "Easy":

            length = 5;

            sequence = generateNumberSequence(length);

            sequenceType = "numbers";

            break;


        // ---------------------------------------------
        // MEDIUM
        // ---------------------------------------------

        case "Medium":

            length = 6;

            sequence = generateLetterSequence(length);

            sequenceType = "letters";

            break;


        // ---------------------------------------------
        // HARD
        // ---------------------------------------------

        case "Hard":

            length = 7;

            sequence = generateMixedSequence(length);

            sequenceType = "numbers and letters";

            break;


        // ---------------------------------------------
        // EXPERT
        // ---------------------------------------------

        case "Expert":

            length = 9;

            sequence = generateMixedSequence(length);

            sequenceType = "numbers and letters";

            break;


        default:

            throw new Error(
                "Invalid memory difficulty."
            );
    }


    const sequenceText =
        sequence.join(" - ");


    const question =
        `Memorize this sequence: ${sequenceText}. ` +
        `What was the sequence?`;


    const answer =
        sequenceText;


    const explanation =
        `The sequence contained ${length} ${sequenceType}. ` +
        `Recall each item in the exact order.`;


    return {

        question,

        answer,

        explanation

    };
}


module.exports = {

    generateMemory

};