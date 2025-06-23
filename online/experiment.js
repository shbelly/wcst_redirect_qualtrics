// experiment.js — updated to use embedded data injection with Qualtrics

/*************** VARIABLES ***************/

let timeline = [];
const rules = ["color_rule", "shape_rule", "number_rule", "color_rule", "shape_rule", "number_rule", "color_rule"];
let actualRule = rules[0];
let numberOfCorrectResponses = 0;
let counter = 0;
let targetImages = [];
let totalErrors = 0;
let appliedRules = [];
const subjectId = jsPsych.randomization.randomID(15);

// Variables for data collection
let perseverativeErrors = 0;
let nonPerseverativeErrors = 0;
let totalTrials = 0;
let allReactionTimes = [];
let categoriesCompleted = 0;

/*************** TIMELINE ELEMENTS ***************/

const instructions = {
    type: "instructions",
    pages: [
        `<h1>${language.welcomePage.welcome}</h1><br><p>${language.welcomePage.clickNext}</p>`,
        `<p>${language.instruction.fourCards}</p><p>${language.instruction.newCard}</p><p>${language.instruction.clickCard}</p><br><img src="../static/images/instruction.png" style="width: 500px"/></p><p style="color: #f6f6f8">Placeholder</p>`,
        `<p>${language.instruction.rule}</p><p>${language.instruction2.ruleChange}</p><p>${language.instruction2.ruleChange2}</p><br><img src="../static/images/instruction.png" style="width: 500px"/><p>${language.instruction2.clickNext}</p>`
    ],
    show_clickable_nav: true,
    data: { test_part: "instruction" },
    button_label_next: language.button.next,
    button_label_previous: language.button.previous
};

const endTask = {
    type: "html-keyboard-response",
    stimulus: function () {
        return `<h2>${language.end.end}</h2><br><p>${language.end.thankYou}</p>`;
    },
    trial_duration: 3000,
    data: { test_part: "end" },
    on_finish: function (trial) {
        statCalculation(trial);
        sendDataToQualtrics();
    }
};

/*************** EMBEDDED DATA METHOD ***************/

function sendDataToQualtrics() {
    try {
        const correctTrials = jsPsych.data.get().filter({ is_trial: true, correct: true }).count();
        const accuracy = totalTrials > 0 ? (correctTrials / totalTrials) * 100 : 0;
        const avgRT = allReactionTimes.length > 0 ? Math.round(allReactionTimes.reduce((sum, rt) => sum + rt, 0) / allReactionTimes.length) : 0;
        categoriesCompleted = counter;

        console.log("Sending data to Qualtrics via embedded fields");

        if (typeof Qualtrics !== 'undefined' && Qualtrics.SurveyEngine) {
            Qualtrics.SurveyEngine.setEmbeddedData("wcst_subject_id", subjectId);
            Qualtrics.SurveyEngine.setEmbeddedData("wcst_accuracy", accuracy.toFixed(2));
            Qualtrics.SurveyEngine.setEmbeddedData("wcst_avg_rt", avgRT);
            Qualtrics.SurveyEngine.setEmbeddedData("wcst_total_errors", totalErrors);
            Qualtrics.SurveyEngine.setEmbeddedData("wcst_perseverative_errors", perseverativeErrors);
            Qualtrics.SurveyEngine.setEmbeddedData("wcst_non_perseverative_errors", nonPerseverativeErrors);
            Qualtrics.SurveyEngine.setEmbeddedData("wcst_categories_completed", categoriesCompleted);
            Qualtrics.SurveyEngine.setEmbeddedData("wcst_total_trials", totalTrials);

            setTimeout(() => {
                Qualtrics.SurveyEngine.clickNextButton();
            }, 300);
        } else {
            alert('Experiment completed! Data has been saved locally.');
        }
    } catch (error) {
        console.error("Qualtrics data transfer error:", error);
    }
}

/*************** FUNCTIONS ***************/

function preloadImages() {
    for (let i = 1; i < 65; i++) {
        let targetCard = Object.values(cards).find(card => card.trialNumber === i);
        targetImages.push(targetCard.image);
    }
    return targetImages;
}

function addTrials(targetCard) {
    return {
        type: 'html-button-response',
        stimulus: `<h3>${language.task.instruction}</h3>`,
        choices: ["../static/images/triangle_red_1.png", "../static/images/star_green_2.png", "../static/images/diamond_yellow_3.png", "../static/images/circle_blue_4.png"],
        prompt: `<img class='choice' src='${targetCard.image}' />`,
        button_html: '<img class="topCards" src="%choice%" />',
        data: {
            test_part: "card", is_trial: true, card_number: targetCard.trialNumber, correct: "",
            image: targetCard.image, color: targetCard.color, shape: targetCard.shape, number: targetCard.number,
            color_rule: targetCard.colorRule, shape_rule: targetCard.shapeRule, number_rule: targetCard.numberRule,
            correct_in_row: 0
        },
        conditional_function: () => counter == 1,
        on_finish: function (data) {
            totalTrials++;
            allReactionTimes.push(data.rt);
            let previousRule;
            let ruleToUse;

            if (actualRule == "color_rule") {
                ruleToUse = targetCard.colorRule;
                if (counter !== 0) previousRule = targetCard.numberRule;
            } else if (actualRule == "shape_rule") {
                ruleToUse = targetCard.shapeRule;
                previousRule = targetCard.colorRule;
            } else {
                ruleToUse = targetCard.numberRule;
                previousRule = targetCard.shapeRule;
            }

            data.correct_card = ruleToUse;
            data.number_of_rule = (counter % 3) + 1;
            data.category_completed = counter;

            if (parseInt(data.button_pressed) === ruleToUse) {
                data.correct = true;
                numberOfCorrectResponses++;
                data.perseverative_error = 0;
                data.non_perseverative_error = 0;
            } else {
                data.correct = false;
                numberOfCorrectResponses = 0;
                if (parseInt(data.button_pressed) == previousRule) {
                    data.perseverative_error = 1;
                    data.non_perseverative_error = 0;
                    perseverativeErrors++;
                } else {
                    data.perseverative_error = 0;
                    data.non_perseverative_error = 1;
                    nonPerseverativeErrors++;
                }
            }

            if (!data.correct) totalErrors++;
            data.correct_in_row = data.correct ? numberOfCorrectResponses : 0;
            data.total_errors = totalErrors;
        }
    };
}

function addFeedback() {
    return {
        type: 'html-button-response',
        stimulus: `<h3>${language.task.instruction}</h3>`,
        choices: ["../static/images/triangle_red_1.png", "../static/images/star_green_2.png", "../static/images/diamond_yellow_3.png", "../static/images/circle_blue_4.png"],
        button_html: '<img class="topCards" src="%choice%" />',
        stimulus_duration: 750,
        trial_duration: 750,
        data: { test_part: "feedback" },
        prompt: function () {
            return jsPsych.data.get().last(1).values()[0].correct
                ? `<p class="choice feedback" style='color: green; font-size: 5vh'>${language.feedback.correct}</p>`
                : `<p class="choice feedback" style='color: red; font-size: 5vh;'>${language.feedback.wrong}</p>`;
        }
    };
}

function addIfNoEnd(targetCard) {
    return {
        timeline: [addTrials(targetCard), addFeedback()],
        conditional_function: () => counter !== 7
    };
}

function CheckRestricted(src, restricted) {
    return !src.split("").some(ch => restricted.indexOf(ch) === -1);
}

/*************** TIMELINE ***************/

timeline.push({ type: "fullscreen", fullscreen_mode: true }, instructions);
for (let i = 1; i < 65; i++) {
    let targetCard = Object.values(cards).find(card => card.trialNumber === i);
    timeline.push(addIfNoEnd(targetCard));
}
timeline.push(endTask, { type: "fullscreen", fullscreen_mode: false });
jsPsych.data.addProperties({ subject: subjectId });

/*************** START + DATA HOOKS ***************/

jsPsych.init({
    timeline: timeline,
    preload_images: preloadImages(),

    on_close: function () {
        sendDataToQualtrics();
        jsPsych.data.get().localSave('csv', `WCST_subject_${subjectId}_quitted_output.csv`);
    },

    on_data_update: function () {
        if (jsPsych.data.get().last(1).values()[0].is_trial === true) {
            let n1 = jsPsych.data.get().filter({ is_trial: true }).last(1).values()[0];
            let n2 = jsPsych.data.get().filter({ is_trial: true }).last(2).values()[0];
            let n3 = jsPsych.data.get().filter({ is_trial: true }).last(3).values()[0];

            n1.failure_to_maintain = (n1.trial_number > 1 && !n1.correct && n2.correct_in_row > 4 && n2.correct_in_row !== 10) ? 1 : 0;

            if (n1.button_pressed == n1.color_rule) appliedRules.push("C");
            if (n1.button_pressed == n1.shape_rule) appliedRules.push("S");
            if (n1.button_pressed == n1.number_rule) appliedRules.push("N");

            n1.applied_rules = appliedRules.join("");
            appliedRules = [];

            n1.perseverative_response = (!n1.correct && n2 && CheckRestricted(n1.applied_rules, n2.applied_rules)) ? 1 : 0;
            n1.conceptual_level_response = (n1.correct && n2?.correct && n3?.correct) ? 1 : 0;
        }

        if (numberOfCorrectResponses === 10) {
            numberOfCorrectResponses = 0;
            counter++;
            actualRule = rules[counter];
        }

        let interactionData = jsPsych.data.getInteractionData();
        const trialIndex = jsPsych.data.get().last(1).values()[0].trial_index;
        const lastEvents = interactionData.filter({ trial: trialIndex }).values();
        if (lastEvents) jsPsych.data.get().last(1).values()[0].browser_events = JSON.stringify(lastEvents);
    },

    on_finish: function () {
        sendDataToQualtrics();
        if (typeof window.onWCSTComplete === 'function') window.onWCSTComplete();
        jsPsych.data.get().localSave('csv', `WCST_subject_${subjectId}_output.csv`);
    }
});
