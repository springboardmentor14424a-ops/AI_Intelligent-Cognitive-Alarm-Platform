// =====================================================
// RIDDLE CHALLENGE GENERATOR
// =====================================================

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}


// =====================================================
// RIDDLE BANK
// =====================================================

const beginnerRiddles = [

    {
        question:
            "I have hands but cannot clap. What am I?",

        answer:
            "clock",

        explanation:
            "A clock has hands that show the time."
    },

    {
        question:
            "I have four legs but cannot walk. What am I?",

        answer:
            "table",

        explanation:
            "A table can have four legs but cannot walk."
    },

    {
        question:
            "I am full of holes but can still hold water. What am I?",

        answer:
            "sponge",

        explanation:
            "A sponge has many holes but absorbs and holds water."
    },

    {
        question:
            "I have a face and two hands but no arms or legs. What am I?",

        answer:
            "clock",

        explanation:
            "A clock has a face and hands that show time."
    }

];


// =====================================================
// EASY RIDDLES
// =====================================================

const easyRiddles = [

    {
        question:
            "The more you take away from me, the larger I become. What am I?",

        answer:
            "hole",

        explanation:
            "Removing material from a hole makes it larger."
    },

    {
        question:
            "I can travel around the world while staying in one corner. What am I?",

        answer:
            "stamp",

        explanation:
            "A postage stamp stays on the corner of an envelope while the envelope travels."
    },

    {
        question:
            "I have keys but cannot open locks. What am I?",

        answer:
            "keyboard",

        explanation:
            "A keyboard has keys used for typing."
    },

    {
        question:
            "I get wetter the more I dry. What am I?",

        answer:
            "towel",

        explanation:
            "A towel becomes wet while drying another object."
    }

];


// =====================================================
// MEDIUM RIDDLES
// =====================================================

const mediumRiddles = [

    {
        question:
            "I speak without a mouth and hear without ears. " +
            "I have no body, but I come alive with sound. What am I?",

        answer:
            "echo",

        explanation:
            "An echo is a reflected sound."
    },

    {
        question:
            "I am always in front of you but can never be seen. What am I?",

        answer:
            "future",

        explanation:
            "The future is always ahead of us but cannot be directly seen."
    },

    {
        question:
            "What has cities, roads and rivers but no people, cars or water?",

        answer:
            "map",

        explanation:
            "A map represents cities, roads and rivers."
    },

    {
        question:
            "I become smaller every time I take a bath. What am I?",

        answer:
            "soap",

        explanation:
            "Soap gradually becomes smaller when it is used with water."
    }

];


// =====================================================
// HARD RIDDLES
// =====================================================

const hardRiddles = [

    {
        question:
            "A man shaves several times a day, yet he still has a beard. " +
            "Who is he?",

        answer:
            "barber",

        explanation:
            "A barber shaves other people's beards."
    },

    {
        question:
            "What can fill a room but takes up no physical space?",

        answer:
            "light",

        explanation:
            "Light can illuminate an entire room without occupying physical space like an object."
    },

    {
        question:
            "What disappears as soon as you say its name?",

        answer:
            "silence",

        explanation:
            "Speaking breaks the silence."
    },

    {
        question:
            "A person walks into a room and sees three switches. " +
            "Only one controls a lamp in another room. " +
            "How can they determine which switch controls the lamp " +
            "if they can enter the lamp room only once?",

        answer:
            "use heat",

        explanation:
            "Turn one switch on for a while, turn it off, turn another on, " +
            "then enter the room. The lit bulb corresponds to the second switch; " +
            "the warm unlit bulb corresponds to the first."
    }

];


// =====================================================
// EXPERT RIDDLES
// =====================================================

const expertRiddles = [

    {
        question:
            "You have two ropes. Each rope takes exactly one hour to burn, " +
            "but they do not burn at a uniform rate. " +
            "How can you measure exactly 45 minutes?",

        answer:
            "light both ends of one rope and one end of the other",

        explanation:
            "The first rope burns completely in 30 minutes. " +
            "Then light the second end of the remaining rope. " +
            "It will take another 15 minutes to finish, giving 45 minutes total."
    },

    {
        question:
            "A farmer has chickens and rabbits. " +
            "There are 10 heads and 28 legs. " +
            "How many rabbits are there?",

        answer:
            "4 rabbits",

        explanation:
            "If there are 4 rabbits, they have 16 legs. " +
            "The remaining 6 chickens have 12 legs. " +
            "16 + 12 = 28 legs."
    },

    {
        question:
            "You have 8 identical-looking balls. " +
            "One is heavier than the others. " +
            "Using a balance scale, what is the minimum number of weighings " +
            "needed to guarantee finding the heavier ball?",

        answer:
            "2",

        explanation:
            "Divide the balls into groups of 3, 3 and 2. " +
            "Use the first weighing to identify the heavier group, " +
            "then the second weighing identifies the heavier ball."
    }

];


// =====================================================
// MAIN FUNCTION
// =====================================================

function generateRiddle(difficulty) {

    let riddle;

    switch (difficulty) {

        case "Beginner":
            riddle = randomItem(beginnerRiddles);
            break;

        case "Easy":
            riddle = randomItem(easyRiddles);
            break;

        case "Medium":
            riddle = randomItem(mediumRiddles);
            break;

        case "Hard":
            riddle = randomItem(hardRiddles);
            break;

        case "Expert":
            riddle = randomItem(expertRiddles);
            break;

        default:
            throw new Error(
                "Invalid riddle difficulty."
            );
    }

    return {

        question: riddle.question,

        answer: riddle.answer,

        explanation: riddle.explanation

    };
}


module.exports = {

    generateRiddle

};