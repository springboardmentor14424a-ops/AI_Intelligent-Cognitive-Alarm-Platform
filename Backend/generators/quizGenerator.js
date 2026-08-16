// =====================================================
// QUIZ CHALLENGE GENERATOR
// =====================================================

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] =
            [result[j], result[i]];
    }

    return result;
}


// =====================================================
// QUIZ BANK
// =====================================================

const quizBank = {

    Beginner: [

        {
            question: "How many days are there in a week?",

            options: [
                "5",
                "6",
                "7",
                "8"
            ],

            answer: "7",

            explanation:
                "A week contains 7 days."
        },

        {
            question: "Which planet is known as the Red Planet?",

            options: [
                "Earth",
                "Mars",
                "Venus",
                "Jupiter"
            ],

            answer: "Mars",

            explanation:
                "Mars is commonly called the Red Planet because of its reddish appearance."
        },

        {
            question: "How many sides does a triangle have?",

            options: [
                "2",
                "3",
                "4",
                "5"
            ],

            answer: "3",

            explanation:
                "A triangle has three sides."
        },

        {
            question: "Which animal is commonly known as man's best friend?",

            options: [
                "Cat",
                "Dog",
                "Horse",
                "Rabbit"
            ],

            answer: "Dog",

            explanation:
                "Dogs are commonly described as man's best friend."
        }

    ],


    // =================================================
    // EASY
    // =================================================

    Easy: [

        {
            question:
                "What is the capital city of France?",

            options: [
                "Rome",
                "Paris",
                "Madrid",
                "Berlin"
            ],

            answer: "Paris",

            explanation:
                "Paris is the capital of France."
        },

        {
            question:
                "Which gas do humans primarily need for respiration?",

            options: [
                "Oxygen",
                "Carbon dioxide",
                "Nitrogen",
                "Hydrogen"
            ],

            answer: "Oxygen",

            explanation:
                "Humans use oxygen during cellular respiration."
        },

        {
            question:
                "What is 12 × 5?",

            options: [
                "50",
                "55",
                "60",
                "65"
            ],

            answer: "60",

            explanation:
                "12 × 5 = 60."
        },

        {
            question:
                "Which ocean is the largest?",

            options: [
                "Atlantic Ocean",
                "Indian Ocean",
                "Pacific Ocean",
                "Arctic Ocean"
            ],

            answer: "Pacific Ocean",

            explanation:
                "The Pacific Ocean is the largest ocean on Earth."
        }

    ],


    // =================================================
    // MEDIUM
    // =================================================

    Medium: [

        {
            question:
                "Which data structure follows the FIFO principle?",

            options: [
                "Stack",
                "Queue",
                "Tree",
                "Graph"
            ],

            answer: "Queue",

            explanation:
                "A queue follows First In, First Out (FIFO)."
        },

        {
            question:
                "What is the binary representation of decimal 5?",

            options: [
                "100",
                "101",
                "110",
                "111"
            ],

            answer: "101",

            explanation:
                "Decimal 5 is represented as 101 in binary."
        },

        {
            question:
                "Which part of a computer performs most processing operations?",

            options: [
                "CPU",
                "Keyboard",
                "Monitor",
                "Speaker"
            ],

            answer: "CPU",

            explanation:
                "The CPU executes instructions and performs processing operations."
        },

        {
            question:
                "If all roses are flowers and some flowers fade quickly, " +
                "can we conclude that all roses fade quickly?",

            options: [
                "Yes",
                "No",
                "Always",
                "Only in winter"
            ],

            answer: "No",

            explanation:
                "The statement only says some flowers fade quickly, not all flowers."
        }

    ],


    // =================================================
    // HARD
    // =================================================

    Hard: [

        {
            question:
                "Which algorithm has an average-case time complexity of O(n log n)?",

            options: [
                "Linear Search",
                "Binary Search",
                "Merge Sort",
                "Bubble Sort"
            ],

            answer: "Merge Sort",

            explanation:
                "Merge Sort has O(n log n) time complexity in its average and worst cases."
        },

        {
            question:
                "In machine learning, which technique is commonly used " +
                "to reduce overfitting?",

            options: [
                "Regularization",
                "Removing all data",
                "Increasing noise",
                "Deleting the model"
            ],

            answer: "Regularization",

            explanation:
                "Regularization penalizes overly complex models and can reduce overfitting."
        },

        {
            question:
                "If a fair coin is tossed twice, what is the probability " +
                "of getting two heads?",

            options: [
                "1/2",
                "1/3",
                "1/4",
                "3/4"
            ],

            answer: "1/4",

            explanation:
                "The possible outcomes are HH, HT, TH and TT. " +
                "Only HH gives two heads, so the probability is 1/4."
        },

        {
            question:
                "Which principle states that a system should expose " +
                "only what is necessary to other components?",

            options: [
                "Encapsulation",
                "Inheritance",
                "Recursion",
                "Iteration"
            ],

            answer: "Encapsulation",

            explanation:
                "Encapsulation restricts direct access to internal implementation details."
        }

    ],


    // =================================================
    // EXPERT
    // =================================================

    Expert: [

        {
            question:
                "A classifier has 90 true positives and 10 false positives. " +
                "What is its precision?",

            options: [
                "80%",
                "85%",
                "90%",
                "95%"
            ],

            answer: "90%",

            explanation:
                "Precision = TP / (TP + FP) = 90 / 100 = 90%."
        },

        {
            question:
                "If a binary tree has height h, what is the maximum number " +
                "of nodes it can contain when the root is at level 0?",

            options: [
                "2h",
                "2^h",
                "2^(h+1) - 1",
                "h²"
            ],

            answer: "2^(h+1) - 1",

            explanation:
                "A complete binary tree with height h has " +
                "2^(h+1) - 1 nodes at maximum."
        },

        {
            question:
                "Which situation is most likely to cause data leakage " +
                "during machine learning model evaluation?",

            options: [
                "Normalizing training data",
                "Using test-set information during training",
                "Using cross-validation",
                "Shuffling training data"
            ],

            answer:
                "Using test-set information during training",

            explanation:
                "Test-set information must remain unseen during training."
        },

        {
            question:
                "A model achieves 99% training accuracy but only 70% test accuracy. " +
                "What is the most likely explanation?",

            options: [
                "Underfitting",
                "Overfitting",
                "Perfect generalization",
                "Data normalization"
            ],

            answer: "Overfitting",

            explanation:
                "A large difference between training and test performance " +
                "is a common sign of overfitting."
        }

    ]

};


// =====================================================
// MAIN FUNCTION
// =====================================================

function generateQuiz(difficulty) {

    const questions =
        quizBank[difficulty];

    if (!questions) {

        throw new Error(
            "Invalid quiz difficulty."
        );
    }


    const selectedQuestion =
        randomItem(questions);


    const shuffledOptions =
        shuffle(selectedQuestion.options);


    return {

        question:
            selectedQuestion.question,

        options:
            shuffledOptions,

        answer:
            selectedQuestion.answer,

        explanation:
            selectedQuestion.explanation

    };
}


module.exports = {

    generateQuiz

};