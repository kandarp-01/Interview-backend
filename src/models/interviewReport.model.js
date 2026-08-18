const mongoose = require("mongoose");

/* =========================================================
   Technical Question
========================================================= */

const technicalQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Technical question is required"],
      trim: true,
    },

    intention: {
      type: String,
      required: [true, "Technical question intention is required"],
      trim: true,
    },

    answer: {
      type: String,
      required: [true, "Technical question answer is required"],
      trim: true,
    },
  },
  {
    _id: false,
  }
);


/* =========================================================
   Behavioural Question
========================================================= */

const behaviouralQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Behavioural question is required"],
      trim: true,
    },

    intention: {
      type: String,
      required: [true, "Behavioural question intention is required"],
      trim: true,
    },

    answer: {
      type: String,
      required: [true, "Behavioural question answer is required"],
      trim: true,
    },
  },
  {
    _id: false,
  }
);


/* =========================================================
   Skill Gap
========================================================= */

const skillGapSchema = new mongoose.Schema(
  {
    skill: {
      type: String,
      required: [true, "Skill is required"],
      trim: true,
    },

    severity: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: "Severity must be low, medium, or high",
      },
      required: [true, "Severity is required"],
    },
  },
  {
    _id: false,
  }
);


/* =========================================================
   Preparation Plan
========================================================= */

const preparationPlanSchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: [true, "Day is required"],
      min: [1, "Day must be at least 1"],
      max: [7, "Day cannot be greater than 7"],
    },

    focus: {
      type: String,
      required: [true, "Focus is required"],
      trim: true,
    },

    tasks: {
      type: [
        {
          type: String,
          required: true,
          trim: true,
        },
      ],
      required: [true, "Tasks are required"],
      validate: {
        validator: function (tasks) {
          return tasks.length >= 1;
        },
        message: "At least one task is required",
      },
    },
  },
  {
    _id: false,
  }
);


/* =========================================================
   Interview Report
========================================================= */

const interviewReportSchema = new mongoose.Schema(
  {
    jobDescription: {
      type: String,
      required: [true, "Job Description is required"],
      trim: true,
    },

    resume: {
      type: String,
      required: [true, "Resume is required"],
      trim: true,
    },

    selfDescription: {
      type: String,
      required: [true, "Self Description is required"],
      trim: true,
    },

    matchScore: {
      type: Number,
      required: [true, "Match score is required"],
      min: [0, "Match score cannot be less than 0"],
      max: [100, "Match score cannot be greater than 100"],
    },

    technicalQuestions: {
      type: [technicalQuestionSchema],
      required: [true, "Technical questions are required"],

      validate: {
        validator: function (questions) {
          return questions.length >= 1;
        },
        message: "At least one technical question is required",
      },
    },

    behaviouralQuestions: {
      type: [behaviouralQuestionSchema],
      required: [true, "Behavioural questions are required"],

      validate: {
        validator: function (questions) {
          return questions.length >= 1;
        },
        message: "At least one behavioural question is required",
      },
    },

    skillGaps: {
      type: [skillGapSchema],
      default: [],
    },

    preparationPlan: {
      type: [preparationPlanSchema],
      required: [true, "Preparation plan is required"],

      validate: {
        validator: function (plan) {
          return plan.length === 7;
        },
        message: "Preparation plan must contain exactly 7 days",
      },
    },
    user:{
      type:mongoose.Schema.Types.ObjectId,
      ref: 'user'
    },
    title:{
      type:String,
      required:[ true, "Job title is required"]
    }
  },

  {
    timestamps: true,
  }
);


const interviewReportModel = mongoose.model(
  "InterviewReport",
  interviewReportSchema
);

module.exports = interviewReportModel;