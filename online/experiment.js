// experiment.js — modified to redirect to Qualtrics with embedded data

/*************** VARIABLES ***************/

let timeline = [];
const rules = ["color_rule", "shape_rule", "number_rule", "color_rule", "shape_rule", "number_rule", "color_rule"];
let actualRule = rules[0]
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
        `<p>${language.instruction.rule}</p><p>${language.instruction2.ruleChange}</p><p>${language.instruction2.ruleChange2}</p><br><img src="../static/images/instruction.png" style="width: 500px"/><p>${language.instruction2.clickNext}</p>`,
    ],
    show_clickable_nav: true,
    data: {test_part: "instruction"},
    button_label_next: language.button.next,
    button_label_previous: language.button.previous
};

const endTask = {
    type: "html-keyboard-response",
    stimulus: function() {
        return `<h2>${language.end.end}</h2><br><p>${language.end.thankYou}</p>`;
    },
    trial_duration: 3000,
    data: {test_part: "end"},
    on_finish: function (trial) { 
        statCalculation(trial);
        sendDataToQualtrics();
    }
};

/*************** REDIRECT METHOD ***************/

function sendDataToQualtrics() {
    try {
        const correctTrials = jsPsych.data.get().filter({is_trial: true, correct: true}).count();
        const accuracy = totalTrials > 0 ? (correctTrials / totalTrials) * 100 : 0;
        const avgRT = allReactionTimes.length > 0 ?
            Math.round(allReactionTimes.reduce((sum, rt) => sum + rt, 0) / allReactionTimes.length) : 0;
        categoriesCompleted = counter;

        const redirectUrl = new URL("https://oregon.qualtrics.com/jfe/form/SV_3pAnL2TwkoIaofk");
        redirectUrl.searchParams.set("wcst_subject_id", subjectId);
        redirectUrl.searchParams.set("wcst_accuracy", accuracy.toFixed(2));
        redirectUrl.searchParams.set("wcst_avg_rt", avgRT);
        redirectUrl.searchParams.set("wcst_total_errors", totalErrors);
        redirectUrl.searchParams.set("wcst_perseverative_errors", perseverativeErrors);
        redirectUrl.searchParams.set("wcst_non_perseverative_errors", nonPerseverativeErrors);
        redirectUrl.searchParams.set("wcst_categories_completed", categoriesCompleted);
        redirectUrl.searchParams.set("wcst_total_trials", totalTrials);

        console.log("Redirecting to Qualtrics with URL:", redirectUrl.toString());

        window.location.href = redirectUrl.toString();

    } catch (error) {
        console.error("Redirect error:", error);
    }
} 

/*************** FUNCTIONS ***************/
              
function preloadImages () {
    for (i = 1; i < 65; i++) {
        let targetCard = Object.values(cards).filter(card => card.trialNumber === i)[0];
        targetImages.push(targetCard.image);
    }
    return targetImages;
}
                     
function addTrials (targetCard) {
    return trial = {
        type: 'html-button-response',
        stimulus: `<h3>${language.task.instruction}</h3>`,
        choices: ["../static/images/triangle_red_1.png", "../static/images/star_green_2.png", "../static/images/diamond_yellow_3.png", "../static/images/circle_blue_4.png"],
        prompt: "<img class='choice' src='" + `${targetCard.image}` + "' />",
        button_html: '<img class="topCards" src="%choice%" />',
        data: {test_part: "card", is_trial: true, card_number: targetCard.trialNumber, correct: "", image: targetCard.image, color: targetCard.color, shape: targetCard.shape, number: targetCard.number, color_rule: targetCard.colorRule, shape_rule: targetCard.shapeRule, number_rule: targetCard.numberRule, correct_in_row: 0}, applied_rule: "", applied_rule2: "", applied_rule3: "",
        conditional_function: function() {
            return counter == 1;
            },
        on_finish: function(data){
            totalTrials++;
            allReactionTimes.push(data.rt);
            let previousRule;
            if (actualRule == "color_rule") {
                ruleToUse = targetCard.colorRule;
                if (counter !== 0){
                     previousRule = targetCard.numberRule;
                 }                        
            } else if (actualRule == "shape_rule") {
                ruleToUse = targetCard.shapeRule;
                previousRule = targetCard.colorRule;
            }
            else {
                ruleToUse = targetCard.numberRule;
                previousRule = targetCard.shapeRule;
            }

            data.correct_card = ruleToUse;
            data.number_of_rule = (counter%3)+1;
            data.category_completed = counter;
                
            if(parseInt(data.button_pressed) === ruleToUse){
                data.correct = true;
                numberOfCorrectResponses++;
                data.perseverative_error = 0;
                data.non_perseverative_error = 0;
            } else {
                data.correct = false;
                numberOfCorrectResponses = 0;
                if(parseInt(data.button_pressed) == previousRule) {
                    data.perseverative_error = 1;
                    data.non_perseverative_error = 0;
                    perseverativeErrors++;
                } else {
                    data.perseverative_error = 0;
                    data.non_perseverative_error = 1;
                    nonPerseverativeErrors++;
                }
            }

            if (data.correct === true) {
                data.correct_in_row = numberOfCorrectResponses;
            } else {
                data.correct_in_row = 0;
                totalErrors++;
            }
            data.total_errors = totalErrors;    
        }          
    }
}        

function addFeedback () {
    return feedback = {
        type: 'html-button-response',
        stimulus: `<h3>${language.task.instruction}</h3>`,
        choices: ["../static/images/triangle_red_1.png", "../static/images/star_green_2.png", "../static/images/diamond_yellow_3.png", "../static/images/circle_blue_4.png"],
        button_html: '<img class="topCards" src="%choice%" />',
        stimulus_duration: 750,
        trial_duration: 750,
        data: {test_part: "feedback"},
        prompt: function(){
            var last_trial_correct = jsPsych.data.get().last(1).values()[0].correct;
            if(last_trial_correct){
                return `<p class="choice feedback" style='color: green; font-size: 5vh'>${language.feedback.correct}</p>`;
            } else {
                return `<p class="choice feedback" style='color: red; font-size: 5vh;'>${language.feedback.wrong}</p>`;
            }
        }
    }
}

function addIfNoEnd(targetCard){
    return if_node = {
        timeline: [addTrials(targetCard), addFeedback()],
        conditional_function: function(){
            return counter !== 7;
        }
    }
}

function CheckRestricted(src, restricted) {
    return !src.split("").some(ch => restricted.indexOf(ch) == -1);
}

/*************** TIMELINE ***************/
        
timeline.push({type: "fullscreen", fullscreen_mode: true}, instructions)

for (let i = 1; i < 65; i++) {
    let targetCard = Object.values(cards).filter(card => card.trialNumber === i)[0]
    timeline.push(addIfNoEnd(targetCard))
}

jsPsych.data.addProperties({subject: subjectId});
timeline.push(endTask, {type: "fullscreen", fullscreen_mode: false})

/*************** EXPERIMENT START AND DATA UPDATE ***************/

jsPsych.init({
    timeline: timeline,
    preload_images: preloadImages(),
    
    on_close: function() {
        sendDataToQualtrics();
        jsPsych.data.get().localSave('csv', `WCST_subject_${subjectId}_quitted_output.csv`);
    },

    on_data_update: function () {
        if (jsPsych.data.get().last(1).values()[0].is_trial === true) {
            let nMinus1Trial = jsPsych.data.get().filter({is_trial: true}).last(1).values()[0];
            let nMinus2Trial = jsPsych.data.get().filter({is_trial: true}).last(2).values()[0];
            let nMinus3Trial = jsPsych.data.get().filter({is_trial: true}).last(3).values()[0];

            if (nMinus1Trial.trial_number > 1 && nMinus1Trial.correct === false && nMinus2Trial.correct_in_row > 4 && nMinus2Trial.correct_in_row !== 10) {
                nMinus1Trial.failure_to_maintain = 1;
            } else {
                nMinus1Trial.failure_to_maintain = 0;
            }

            if (nMinus1Trial.button_pressed == nMinus1Trial.color_rule) appliedRules.push("C");
            if (nMinus1Trial.button_pressed == nMinus1Trial.shape_rule) appliedRules.push("S");
            if (nMinus1Trial.button_pressed == nMinus1Trial.number_rule) appliedRules.push("N");

            nMinus1Trial.applied_rules = appliedRules.join("");
            appliedRules = [];

            if (nMinus2Trial) {
                let isSame = CheckRestricted(nMinus1Trial.applied_rules, nMinus2Trial.applied_rules) || CheckRestricted(nMinus2Trial.applied_rules, nMinus1Trial.applied_rules);
                nMinus1Trial.perseverative_response = (nMinus1Trial.correct === false && isSame === true) ? 1 : 0;
            } else {
                nMinus1Trial.perseverative_response = 0;
            }

            if (nMinus3Trial) {
                nMinus1Trial.conceptual_level_response = (nMinus1Trial.correct && nMinus2Trial.correct && nMinus3Trial.correct) ? 1 : 0;
            } else {
                nMinus1Trial.conceptual_level_response = 0;
            }
        }

        if (numberOfCorrectResponses == 10) {
            numberOfCorrectResponses = 0;
            counter++;
            actualRule = rules[counter];
        }

        let interactionData = jsPsych.data.getInteractionData();
        const interactionDataOfLastTrial = interactionData.filter({ 'trial': jsPsych.data.get().last(1).values()[0].trial_index }).values();
        if (interactionDataOfLastTrial) {
            jsPsych.data.get().last(1).values()[0].browser_events = JSON.stringify(interactionDataOfLastTrial);
        }
    },

    on_finish: function() {
        sendDataToQualtrics();
        if (typeof window.onWCSTComplete === 'function') {
            window.onWCSTComplete();
        }
        jsPsych.data.get().localSave('csv', `WCST_subject_${subjectId}_output.csv`);
    }
});
