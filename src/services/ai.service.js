const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const interviewReportSchema = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "A number between 0 and 100 representing how well the candidate matches the job description."
    ),

  technicalQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe(
            "A technical interview question based specifically on the job description and candidate resume."
          ),

        intention: z
          .string()
          .describe(
            "What the interviewer wants to evaluate by asking this question."
          ),

        answer: z
          .string()
          .describe(
            "A detailed guide explaining how the candidate should answer this question, including important concepts, points to mention, approach, examples and trade-offs."
          ),
      })
    )
    .describe(
      "A list of technical interview questions. Every item must contain question, intention and answer."
    ),

  behaviouralQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe(
            "A behavioural interview question relevant to the candidate and job."
          ),

        intention: z
          .string()
          .describe(
            "What behavioural skill or quality the interviewer wants to evaluate."
          ),

        answer: z
          .string()
          .describe(
            "A detailed guide explaining how the candidate should answer. Use the candidate's actual experience from the resume and self description. Do not invent experience."
          ),
      })
    )
    .describe(
      "A list of behavioural interview questions. Every item must contain question, intention and answer."
    ),

  skillGaps: z
    .array(
      z.object({
        skill: z
          .string()
          .describe(
            "A skill required or preferred by the job that is missing or insufficiently demonstrated in the candidate's profile."
          ),

        severity: z
          .enum(["low", "medium", "high"])
          .describe(
            "How important this missing skill is for the target job."
          ),
      })
    )
    .describe(
      "A list of skill gaps. Every item must contain skill and severity."
    ),

  preparationPlan: z
    .array(
      z.object({
        day: z
          .number()
          .describe(
            "The day number of the preparation plan starting from 1."
          ),

        focus: z
          .string()
          .describe(
            "The main topic the candidate should focus on during this day."
          ),

        tasks: z
          .array(z.string())
          .describe(
            "Specific tasks the candidate should complete during this day."
          ),
      })
    )
    .describe(
      "A day-wise interview preparation plan. Every item must contain day, focus and tasks."
    ),
});

async function generateInterviewReport({
  jobDescription,
  resume,
  selfDescription
}
) {
  const prompt = `
You are an expert technical recruiter and interview evaluator.

Generate an interview report by comparing the candidate's RESUME against the JOB DESCRIPTION.

IMPORTANT SOURCE RULES:

1. The RESUME is the primary and authoritative source for determining the candidate's skills, experience, projects, education, and achievements.
2. The SELF DESCRIPTION may be used only as additional context.
3. If the self description claims a skill that is not supported by the resume, do NOT treat that skill as confirmed experience.
4. Never invent experience, skills, certifications, projects, responsibilities, or technologies.
5. If a skill is not present in the resume, consider it missing.
6. Do not assume knowledge of one technology simply because the candidate knows a related technology.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume}

SELF DESCRIPTION:
${selfDescription}


MATCH SCORE:

Calculate matchScore from 0 to 100.

Evaluate the candidate requirement-by-requirement against the JOB DESCRIPTION.

For each important JD requirement, classify the candidate as:

DIRECT MATCH:
The exact skill or clearly equivalent experience is explicitly present in the resume.

PARTIAL MATCH:
The candidate has related or transferable knowledge/experience, but does not directly satisfy the requirement.

MISSING:
There is no evidence of the requirement in the resume.

SCORING RULES:

- Required skills have the highest weight.
- Responsibilities and core technical requirements have medium-high weight.
- Nice-to-have skills have lower weight.
- Direct matches should increase the score.
- Partial matches should receive partial credit.
- Missing skills should decrease the score.
- Do NOT return 0 simply because several technologies are missing.
- Return 0 only when there is essentially no meaningful overlap between the candidate and the job.
- The score must reflect overall suitability, not keyword count alone.

Score interpretation:

90-100 = Excellent match
75-89 = Strong match
60-74 = Good match
40-59 = Partial match
20-39 = Weak match
0-19 = Very weak match


TECHNICAL QUESTIONS:

Generate 5 to 7 technical interview questions.

Questions must be specifically based on the JOB DESCRIPTION and the candidate's RESUME.

Prioritize:

- Technologies required by the JD
- Skills present in the candidate's resume
- Important gaps between the candidate and JD
- Concepts relevant to the responsibilities of the role

Avoid generic software engineering questions when a more specific question can be asked.

For example, if the JD requires Node.js but the resume contains FastAPI, a useful question could compare backend/API concepts rather than pretending the candidate has Node.js experience.

Each technical question MUST contain exactly:

{
  "question": "...",
  "intention": "...",
  "answer": "..."
}

The "answer" should be an ideal/reference answer, NOT an answer claimed to have been given by the candidate.


BEHAVIOURAL QUESTIONS:

Generate 4 to 5 behavioural interview questions.

Questions should be relevant to the candidate's actual experience, projects, internships, problem-solving background, and the responsibilities of the JD.

Do not invent situations that are not present in the resume.

Each item MUST contain exactly:

{
  "question": "...",
  "intention": "...",
  "answer": "..."
}

The "answer" should be an ideal/reference answer.


SKILL GAPS:

Identify actual skill gaps by comparing the RESUME against the JOB DESCRIPTION.

Only include genuine missing or weakly matched requirements.

Do NOT generate generic gaps such as:

- "Professional experience"
- "Industry experience"
- "Technical expertise"
- "Required certifications"

unless the JD explicitly requires them.

Instead, identify concrete gaps such as:

- Node.js
- Express.js
- JWT authentication
- Docker
- Redis
- Socket.IO
- AWS
- CI/CD
- Kubernetes

Only include a skill if it is actually required or strongly relevant to the JD.

Each item MUST contain exactly:

{
  "skill": "...",
  "severity": "low | medium | high"
}

Severity rules:

HIGH:
Important required skill that is missing.

MEDIUM:
Important skill where the candidate has partial/related experience or a less critical requirement is missing.

LOW:
Nice-to-have skill or minor gap.


PREPARATION PLAN:

Generate exactly 7 days.

The preparation plan MUST be based on the actual skill gaps identified above.

Do not generate a generic preparation plan.

For example, if Node.js, Express.js, JWT, Docker, and Socket.IO are missing, the preparation plan should prioritize those topics.

Each day MUST contain exactly:

{
  "day": 1,
  "focus": "...",
  "tasks": [
    "...",
    "..."
  ]
}

The day values MUST be exactly:

1, 2, 3, 4, 5, 6, 7


STRICT OUTPUT REQUIREMENTS:

- Return ONLY valid JSON.
- Do not return Markdown.
- Do not use code fences.
- Do not add explanations outside the JSON.
- Do not add extra properties.
- Do not remove required properties.
- Follow the provided response schema exactly.
`;

  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: zodToJsonSchema(interviewReportSchema),
    },
  });

  const report = JSON.parse(response.candidates[0].content.parts[0].text);
  return report;
}

module.exports = generateInterviewReport;