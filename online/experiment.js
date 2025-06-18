/* 
Created by Teodora Vekony (vekteo@gmail.com)
MEMO Team (PI: Dezso Nemeth)
Lyon Neuroscience Research Center
Universite Claude Bernard Lyon 1

Github:https://github.com/vekteo/Wisconsin_JSPsych
*/

/*************** TASK CONFIG ***************/
/*************** TASK CONFIG ***************/

// Get subject ID from URL or default
const subjectId = jsPsych.data.getURLVariable('wcst_subject_id') || 'no_id';

// Variables for tracking performance & state
let timeline = [];
let counter = 1;               // Rule counter (starts from 1)
let numberOfCorrectResponses = 0;
let totalErrors = 0;
let appliedRules = [];
const rules = ["color_rule", "shape_rule", "number_rule"];
let actualRule = rules[0];
let targetImages = [];

/*************** INSTRUCTIONS ***************/
const instructions = {
  type: "instructions",
  pages: [
    `<h1>${language.welcomePage.welcome}</h1><br><p>${language.welcomePage.clickNext}</p>`,
    `<p>${language.instruction.fourCards}</p><p>${language.instruction.newCard}</p><p>${language.instruction.clickCard}</p><br><img src="../static/images/instruction.png" style="width: 500px"/></p><p style="color: #f6f6f8">Placeholder</p>`,
    `<p>${language.instruction.rule}</p><p>${language.instruction2.ruleChange}</p><p>${language.instruction2.ruleChange2}</p><br><img src="../static/images/instruction.png" style="width: 500px"/><p>${language.instruction2.clickNext}</p>`,
  ],
  show_clickable_nav: true,
  data: { test_part: "instruction" },
  button_label_next: language.button.next,
  button_label_previous: language.button.previous
};

/*************** END TASK ***************/
const endTask = {
  type: "html-keyboard-response",
  stimulus: function () {
    return `<h2>${language.end.end}</h2><br><p>${language.end.thankYou}</p>`;
  },
  trial_duration: 3000,
  data: { test_part: "end" },
  on_finish: function (trial) {
    statCalculation(trial);
  }
};

/*************** FUNCTIONS ***************/

// Preload all target images from cards object
function preloadImages() {
  targetImages = [];
  for (let i = 1; i < 65; i++) {
    let targetCard = Object.values(cards).find(card => card.trialNumber === i);
    if (targetCard) {
      targetImages.push(targetCard.image);
    }
  }
  return targetImages;
}

// Add trial with card matching
function addTrials(targetCard) {
  return {
    type: 'html-button-response',
    stimulus: `<h3>${language.task.instruction}</h3>`,
    choices: [
      "../static/images/triangle_red_1.png",
      "../static/images/star_green_2.png",
      "../static/images/diamond_yellow_3.png",
      "../static/images/circle_blue_4.png"
    ],
    prompt: `<img class='choice' src='${targetCard.image}' />`,
    button_html: '<img class="topCards" src="%choice%" />',
    data: {
      test_part: "card",
      is_trial: true,
      card_number: targetCard.trialNumber,
      correct: "",
      image: targetCard.image,
      color: targetCard.color,
      shape: targetCard.shape,
      number: targetCard.number,
      color_rule: targetCard.colorRule,
      shape_rule: targetCard.shapeRule,
      number_rule: targetCard.numberRule,
      correct_in_row: 0
    },
    on_finish: function (data) {
      let ruleToUse;
      let previousRule;

      if (actualRule === "color_rule") {
        ruleToUse = targetCard.colorRule;
        previousRule = targetCard.numberRule;
      } else if (actualRule === "shape_rule") {
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
        if (parseInt(data.button_pressed) === previousRule) {
          data.perseverative_error = 1;
          data.non_perseverative_error = 0;
        } else {
          data.perseverative_error = 0;
          data.non_perseverative_error = 1;
        }
      }

      data.correct_in_row = data.correct ? numberOfCorrectResponses : 0;
      if (!data.correct) totalErrors++;
      data.total_errors = totalErrors;
    }
  };
}

// Add feedback after trial
function addFeedback() {
  return {
    type: 'html-button-response',
    stimulus: `<h3>${language.task.instruction}</h3>`,
    choices: [
      "../static/images/triangle_red_1.png",
      "../static/images/star_green_2.png",
      "../static/images/diamond_yellow_3.png",
      "../static/images/circle_blue_4.png"
    ],
    button_html: '<img class="topCards" src="%choice%" />',
    stimulus_duration: 750,
    trial_duration: 750,
    data: { test_part: "feedback" },
    prompt: function () {
      const lastCorrect = jsPsych.data.get().last(1).values()[0].correct;
      return `<p class="choice feedback" style='color: ${lastCorrect ? "green" : "red"}; font-size: 5vh'>${lastCorrect ? language.feedback.correct : language.feedback.wrong}</p>`;
    }
  };
}

// Combine trial + feedback if task not ended
function addIfNoEnd(targetCard) {
  return {
    timeline: [addTrials(targetCard), addFeedback()],
    conditional_function: () => counter !== 7
  };
}

// Helper to check if rule strings are restrictive (used for perseverative errors)
function CheckRestricted(src, restricted) {
  return !src.split("").some(ch => restricted.indexOf(ch) == -1);
}

// Count number of unique categories completed
function countCategories(trials) {
  let rules = trials.select('number_of_rule').values;
  return [...new Set(rules)].length;
}

// Get accuracy and RT stats per rule
function getRuleStats(trials) {
  const ruleStats = {};
  for (let i = 1; i <= 3; i++) {
    const ruleTrials = trials.filter({ number_of_rule: i });
    ruleStats[`rule_${i}`] = {
      accuracy: ruleTrials.select('correct').mean().toFixed(3),
      avg_rt: ruleTrials.select('rt').mean().toFixed(1),
    };
  }
  return ruleStats;
}

/*************** TIMELINE ***************/

// Start fullscreen, then show instructions
timeline.push({ type: "fullscreen", fullscreen_mode: true }, instructions);

// Loop through 64 trials
for (let i = 1; i < 65; i++) {
  const targetCard = Object.values(cards).find(card => card.trialNumber === i);
  timeline.push(addIfNoEnd(targetCard));
}

// Add subjectId to data properties
jsPsych.data.addProperties({ subject: subjectId });

// End task and exit fullscreen
timeline.push(endTask, { type: "fullscreen", fullscreen_mode: false });

/*************** INITIALIZE ***************/
jsPsych.init({
  timeline: timeline,
  display_element: 'jspsych-target',
  preload_images: preloadImages(),
  on_close: function () {
    jsPsych.data.get().localSave('csv', `WCST_subject_${subjectId}_quitted_output.csv`);
  },
  on_data_update: function () {
    const lastTrial = jsPsych.data.get().last(1).values()[0];
    const interactionData = jsPsych.data.getInteractionData();
    const interactionDataOfLastTrial = interactionData.filter({ 'trial': lastTrial.trial_index }).values();
    if (interactionDataOfLastTrial) {
      lastTrial.browser_events = JSON.stringify(interactionDataOfLastTrial);
    }

    if (lastTrial.is_trial) {
      const trials = jsPsych.data.get().filter({ is_trial: true });
      const n1 = trials.last(1).values()[0];
      const n2 = trials.last(2).values()[0];
      const n3 = trials.last(3).values()[0];

      if (n1.trial_number > 1 && n1.correct === false && n2.correct_in_row > 4 && n2.correct_in_row !== 10) {
        n1.failure_to_maintain = 1;
      } else {
        n1.failure_to_maintain = 0;
      }

      if (n1.button_pressed == n1.color_rule) appliedRules.push("C");
      if (n1.button_pressed == n1.shape_rule) appliedRules.push("S");
      if (n1.button_pressed == n1.number_rule) appliedRules.push("N");

      n1.applied_rules = appliedRules.join("");
      appliedRules = [];

      if (n2) {
        const isSame = CheckRestricted(n1.applied_rules, n2.applied_rules) || CheckRestricted(n2.applied_rules, n1.applied_rules);
        n1.perseverative_response = (n1.correct === false && isSame) ? 1 : 0;
      } else {
        n1.perseverative_response = 0;
      }

      if (n3) {
        n1.conceptual_level_response = (n1.correct && n2.correct && n3.correct) ? 1 : 0;
      } else {
        n1.conceptual_level_response = 0;
      }

      if (numberOfCorrectResponses === 10) {
        numberOfCorrectResponses = 0;
        counter++;
        actualRule = rules[counter];
      }
    }
  },
  on_finish: function () {
    const data = jsPsych.data.get();
    const trials = data.filter({ is_trial: true });

    const accuracy = trials.select('correct').mean().toFixed(3);
    const avgRT = trials.select('rt').mean().toFixed(1);
    const totalErrors = trials.select('total_errors').values[trials.count() - 1] || 0;
    const perseverativeErrors = trials.select('perseverative_error').sum();
    const nonPerseverativeErrors = trials.select('non_perseverative_error').sum();
    const totalTrials = trials.count();
    const categoriesCompleted = countCategories(trials);
    const fullData = encodeURIComponent(trials.csv());
    const ruleData = encodeURIComponent(JSON.stringify(getRuleStats(trials)));

    const redirectURL = `https://oregon.qualtrics.com/jfe/form/SV_3pAnL2TwkoIaofk?` +
      `wcst_subject_id=${subjectId}` +
      `&wcst_accuracy=${accuracy}` +
      `&wcst_avg_rt=${avgRT}` +
      `&wcst_total_errors=${totalErrors}` +
      `&wcst_perseverative_errors=${perseverativeErrors}` +
      `&wcst_non_perseverative_errors=${nonPerseverativeErrors}` +
      `&wcst_categories_completed=${categoriesCompleted}` +
      `&wcst_total_trials=${totalTrials}` +
      `&wcst_data=${fullData}` +
      `&wcst_rule_data=${ruleData}`;

    window.location.href = redirectURL;
  }
});
