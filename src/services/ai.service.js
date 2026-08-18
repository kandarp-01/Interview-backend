const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer= require("puppeteer");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const interviewReportSchema = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "A number between 0 and 100 representing how well the candidate matches the job description.",
    ),

  technicalQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe(
            "A technical interview question based specifically on the job description and candidate resume.",
          ),

        intention: z
          .string()
          .describe(
            "What the interviewer wants to evaluate by asking this question.",
          ),

        answer: z
          .string()
          .describe(
            "A detailed guide explaining how the candidate should answer this question, including important concepts, points to mention, approach, examples and trade-offs.",
          ),
      }),
    )
    .describe(
      "A list of technical interview questions. Every item must contain question, intention and answer.",
    ),

  behaviouralQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe(
            "A behavioural interview question relevant to the candidate and job.",
          ),

        intention: z
          .string()
          .describe(
            "What behavioural skill or quality the interviewer wants to evaluate.",
          ),

        answer: z
          .string()
          .describe(
            "A detailed guide explaining how the candidate should answer. Use the candidate's actual experience from the resume and self description. Do not invent experience.",
          ),
      }),
    )
    .describe(
      "A list of behavioural interview questions. Every item must contain question, intention and answer.",
    ),

  skillGaps: z
    .array(
      z.object({
        skill: z
          .string()
          .describe(
            "A skill required or preferred by the job that is missing or insufficiently demonstrated in the candidate's profile.",
          ),

        severity: z
          .enum(["low", "medium", "high"])
          .describe("How important this missing skill is for the target job."),
      }),
    )
    .describe(
      "A list of skill gaps. Every item must contain skill and severity.",
    ),

  preparationPlan: z
    .array(
      z.object({
        day: z
          .number()
          .describe("The day number of the preparation plan starting from 1."),

        focus: z
          .string()
          .describe(
            "The main topic the candidate should focus on during this day.",
          ),

        tasks: z
          .array(z.string())
          .describe(
            "Specific tasks the candidate should complete during this day.",
          ),
      }),
    )
    .describe(
      "A day-wise interview preparation plan. Every item must contain day, focus and tasks.",
    ),
  title: z
    .string()
    .describe(
      "The title of the job for which the interview report is generated",
    ),
});

async function generateInterviewReport({
  jobDescription,
  resume,
  selfDescription,
}) {
  const prompt = `
You are an expert technical recruiter and interview evaluator.

Your task is to generate an interview preparation report by comparing the candidate's RESUME against the JOB DESCRIPTION.

The output MUST strictly follow the provided response schema.

==================================================
IMPORTANT SOURCE RULES
==================================================

1. The RESUME is the primary and authoritative source for determining:
   - skills
   - technical experience
   - work experience
   - projects
   - education
   - certifications
   - achievements
   - tools and technologies

2. The SELF DESCRIPTION is secondary context only.

3. If the self description claims a skill or experience that is not supported by the resume:
   - Do NOT treat it as confirmed professional experience.
   - You may use it only as contextual information when appropriate.

4. Never invent:
   - experience
   - skills
   - technologies
   - projects
   - certifications
   - responsibilities
   - achievements
   - job history

5. If a skill or technology is not present in the resume, consider it missing unless there is clear equivalent evidence.

6. Do not assume knowledge of one technology simply because the candidate knows a related technology.

   Example:
   - FastAPI does NOT mean Node.js experience.
   - React does NOT mean Next.js experience.
   - MongoDB does NOT mean Redis experience.
   - Python async programming does NOT automatically mean Node.js experience.

7. When comparing technologies, clearly distinguish:
   - direct experience
   - transferable knowledge
   - missing experience

==================================================
JOB DESCRIPTION
==================================================

${jobDescription}

==================================================
RESUME
==================================================

${resume}

==================================================
SELF DESCRIPTION
==================================================

${selfDescription}

==================================================
TITLE
==================================================

Extract the job title from the JOB DESCRIPTION.

For example:

If the JD contains:
"Position: Software Engineer"

then:

"title": "Software Engineer"

The title must represent the actual position/job title mentioned in the JD.

Do not create or invent a job title.

==================================================
MATCH SCORE
==================================================

Calculate "matchScore" as a number between 0 and 100.

Evaluate the candidate's overall suitability for the job by comparing the resume against the job description.

Consider:

- Required technical skills
- Required technologies
- Responsibilities
- Candidate's projects
- Candidate's work experience
- Candidate's education where relevant
- Relevant problem-solving experience
- Nice-to-have skills

Scoring principles:

1. Required skills have the highest weight.

2. Core technical responsibilities have medium-high weight.

3. Nice-to-have skills have lower weight.

4. Directly demonstrated skills should contribute strongly to the score.

5. Related or transferable experience may contribute partially.

6. Missing required skills should reduce the score.

7. Missing nice-to-have skills should have a smaller effect.

8. Do NOT return 0 simply because the candidate is missing several technologies.

9. Return a very low score only when there is essentially no meaningful overlap between the candidate and the job.

10. The score should represent overall suitability rather than simple keyword matching.

Score interpretation:

90-100 = Excellent match
75-89 = Strong match
60-74 = Good match
40-59 = Partial match
20-39 = Weak match
0-19 = Very weak match

==================================================
TECHNICAL QUESTIONS
==================================================

Generate 5 to 7 technical interview questions.

Questions MUST be based specifically on the combination of:

- Job description
- Candidate resume
- Candidate's demonstrated technologies
- Important gaps between the candidate and the JD
- Technical responsibilities of the role

Prioritize questions that allow an interviewer to determine whether the candidate can actually perform the job.

Questions should preferably connect the candidate's existing experience to the requirements of the role.

For example:

If the JD requires Node.js and Express.js but the resume contains FastAPI, ask something like:

"Since you have experience building APIs with FastAPI, how would you approach implementing similar routing, middleware, validation, and error handling in Express.js?"

Do NOT pretend that the candidate already has Node.js experience.

Questions can test:

- Directly demonstrated skills
- Transferable concepts
- Missing required technologies
- Architecture
- Databases
- APIs
- Authentication
- Asynchronous programming
- Debugging
- Performance
- Security
- Relevant responsibilities from the JD

Avoid generic questions when a question specifically tied to the resume and JD can be asked.

Each technical question MUST contain exactly:

{
  "question": "...",
  "intention": "...",
  "answer": "..."
}

The "question" must be the interview question.

The "intention" must explain what the interviewer is trying to evaluate.

The "answer" must be an ideal/reference answer or detailed answer guide.

The answer must NOT claim that the candidate has experience they do not have.

When appropriate, the answer should explain:
- important concepts
- expected approach
- relevant examples
- trade-offs
- best practices

==================================================
BEHAVIOURAL QUESTIONS
==================================================

Generate 4 to 5 behavioural interview questions.

Questions must be relevant to:

- Candidate's actual resume
- Candidate's projects
- Candidate's internships
- Candidate's achievements
- Candidate's problem-solving experience
- Candidate's collaboration experience
- Responsibilities of the target role

Do NOT invent situations that are not present in the resume.

For example, if the resume states that the candidate automated NSE stock reports and reduced manual effort by 40%, you may ask:

"Describe a technical challenge you faced while automating the NSE stock report workflow and how you resolved it."

Do not invent the exact challenge.

The candidate should be encouraged to provide the actual details during the interview.

Each behavioural question MUST contain exactly:

{
  "question": "...",
  "intention": "...",
  "answer": "..."
}

The "answer" must be an ideal/reference answer guide.

It should explain what a strong candidate response should cover while remaining grounded in the candidate's actual experience.

Do NOT fabricate events or achievements.

==================================================
SKILL GAPS
==================================================

Identify concrete skill gaps by comparing the resume against the job description.

Only include skills that are:

- explicitly required by the JD and missing from the resume
OR
- strongly relevant/preferred by the JD and missing or insufficiently demonstrated

Examples:

- Node.js
- Express.js
- JWT authentication
- Docker
- Redis
- Socket.IO
- AWS
- CI/CD
- Kubernetes
- Microservices

Do NOT generate vague gaps such as:

- Professional experience
- Technical expertise
- Industry experience
- Career growth
- Communication

unless the JD explicitly requires them.

Do not mark a skill as missing if the resume clearly demonstrates it.

For example:

If the resume contains:
"JavaScript"

then JavaScript should NOT be considered missing.

If the resume contains:
"FastAPI"

and the JD requires:
"Node.js"

then Node.js may be considered a gap.

Each skill gap MUST contain exactly:

{
  "skill": "...",
  "severity": "low | medium | high"
}

Severity rules:

HIGH:
A required and important skill is missing.

MEDIUM:
The skill is partially demonstrated, transferable experience exists, or it is an important but less critical requirement.

LOW:
The skill is primarily a nice-to-have or a minor gap.

==================================================
PREPARATION PLAN
==================================================

Generate exactly 7 preparation days.

The preparation plan MUST be based on the actual skill gaps identified from the resume and JD.

Do NOT generate a generic interview preparation plan.

Prioritize the most important missing required skills first.

For example, if the candidate is missing:

- Node.js
- Express.js
- JWT
- Docker

then the preparation plan should prioritize these topics.

The plan should progressively prepare the candidate for the target role.

A possible progression could include:

- learning missing core technology
- implementing practical examples
- integrating technologies
- security
- databases
- deployment
- final interview practice

However, the actual plan MUST depend on the candidate's identified skill gaps.

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

1
2
3
4
5
6
7

Every day must contain practical and specific tasks.

==================================================
OUTPUT REQUIREMENTS
==================================================

Return ONLY valid JSON.

Do not return Markdown.

Do not use code fences.

Do not add explanations outside the JSON.

The JSON MUST contain exactly these top-level properties:

{
  "matchScore": number,
  "technicalQuestions": [],
  "behaviouralQuestions": [],
  "skillGaps": [],
  "preparationPlan": [],
  "title": string
}

Do not add:

- jobDescription
- resume
- selfDescription
- requirementsEvaluation
- extra metadata
- extra properties

Do not remove any required property.

The "title" MUST be extracted from the JOB DESCRIPTION.

The output must strictly conform to the provided response schema.
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

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `
You are an expert professional resume writer and ATS optimization specialist.

Your task is to create a professional, ATS-friendly resume for the candidate using ONLY the information provided below.

========================
CANDIDATE RESUME
========================

${resume}

========================
SELF DESCRIPTION
========================

${selfDescription}

========================
JOB DESCRIPTION
========================

${jobDescription}

========================
OBJECTIVE
========================

Create a tailored resume that maximizes the candidate's relevance to the given job description while remaining completely truthful.

The final resume should:

1. Present the candidate's strongest and most relevant qualifications first.
2. Tailor the resume specifically to the target job description.
3. Prioritize skills, projects, experience, and achievements that are relevant to the JD.
4. Use terminology and keywords from the job description when those keywords are genuinely supported by the candidate's background.
5. Improve the wording of existing experience so that it is concise, professional, achievement-oriented, and human-written.
6. Make the candidate appear competitive without exaggerating their experience.
7. Remain ATS-friendly and easy for recruiters to scan.
8. Fit ideally within 1-2 pages when converted to PDF.

========================
STRICT TRUTHFULNESS RULES
========================

These rules are extremely important:

- NEVER invent experience.
- NEVER invent a company, project, certification, degree, achievement, responsibility, technology, tool, or job title.
- NEVER claim that the candidate has professional experience with a technology that is not supported by the provided resume.
- NEVER convert a related skill into direct experience.

For example:

If the JD requires Node.js but the resume only mentions FastAPI:
- Do NOT write "Experienced Node.js Developer."
- You may emphasize the candidate's backend/API experience with FastAPI.
- You may mention transferable backend concepts where appropriate.
- Do not falsely add Node.js to the candidate's experience.

If the self-description claims something that is not supported by the resume:
- Do NOT present it as verified professional experience.
- Prefer the resume as the authoritative source.
- The self-description may only provide additional context.

Do not fabricate metrics.

If the original resume contains metrics such as:
- "300,000+ data points"
- "40% reduction"
- "2-3 hours saved per week"
- "97% accuracy"

preserve them when relevant.

Do not create new numbers or performance improvements that were not provided.

========================
JOB DESCRIPTION ANALYSIS
========================

Before constructing the resume, internally identify:

1. Required technical skills.
2. Preferred/nice-to-have skills.
3. Responsibilities.
4. Important keywords.
5. Candidate skills that directly match the JD.
6. Candidate skills that are related but only partially match.
7. Important JD requirements that are missing.

Use this analysis to determine what content should receive the most emphasis.

Do NOT include missing technologies merely to improve ATS keyword matching.

========================
RESUME STRUCTURE
========================

Create the resume using an appropriate professional structure such as:

1. Candidate Name
2. Contact Information
3. Professional Summary
4. Technical Skills
5. Experience
6. Projects
7. Education
8. Certifications / Achievements

Only include sections that are supported by the provided information.

Do not create empty sections.

The exact ordering may be adjusted depending on what is most valuable for the target job.

========================
PROFESSIONAL SUMMARY
========================

Write a concise 2-4 sentence professional summary.

The summary should:

- Be tailored to the target role.
- Highlight the candidate's strongest relevant technical skills.
- Mention relevant experience/projects.
- Mention meaningful achievements when appropriate.
- Use keywords from the JD only when supported by the candidate's background.
- Avoid generic phrases such as "passionate professional", "results-driven individual", or "dynamic team player" unless genuinely useful.
- Sound like a real candidate wrote it.
- Never exaggerate seniority or experience.

========================
TECHNICAL SKILLS
========================

Organize skills into clear categories where appropriate.

For example:

Languages:
Python, JavaScript, C++, SQL

Frontend:
React, HTML, CSS

Backend:
FastAPI, REST APIs

Databases:
MongoDB, MySQL, SQLite

Tools:
Git, GitHub, VS Code

Only include technologies explicitly supported by the provided candidate information.

Do NOT add missing JD technologies simply because they are requested by the employer.

========================
EXPERIENCE
========================

Rewrite experience bullets to be:

- Concise.
- Action-oriented.
- Specific.
- Achievement-focused.
- Relevant to the target role.

Prefer strong action verbs such as:

Developed
Built
Implemented
Automated
Designed
Optimized
Integrated
Analyzed
Improved
Tested

Where the original information supports it.

Do not change the factual meaning of the candidate's experience.

Avoid unnecessarily long paragraphs.

Use bullet points.

========================
PROJECTS
========================

Prioritize projects that are relevant to the target job.

For each relevant project:

- Clearly state the project name.
- Explain what was built.
- Mention the technologies actually used.
- Highlight important technical decisions or functionality.
- Mention measurable results only when provided.
- Keep bullets concise.

Do not invent project functionality.

If the JD requires a technology that the candidate does not have, do not modify an existing project to falsely include that technology.

========================
ACHIEVEMENTS
========================

Prioritize meaningful achievements relevant to the target role.

Examples include:

- Competitive programming achievements.
- Academic achievements.
- Certifications.
- GATE qualification.
- Quantifiable project results.

Do not invent achievements.

========================
ATS REQUIREMENTS
========================

The HTML must be highly ATS-friendly.

Follow these rules:

- Use semantic HTML.
- Use normal text instead of images for important information.
- Do not put resume content inside images.
- Avoid tables for the primary resume layout.
- Avoid multi-column layouts that can cause ATS parsing problems.
- Avoid text positioned absolutely.
- Avoid excessive icons.
- Avoid decorative graphics.
- Use standard section headings.
- Use readable fonts.
- Maintain a logical reading order.
- Use standard bullet lists.
- Ensure contact information is selectable text.
- Ensure all important skills are represented as plain text.
- Do not hide keywords using CSS.
- Do not use white text on a white background.
- Do not use keyword stuffing.

========================
DESIGN REQUIREMENTS
========================

The resume should look modern but professional.

Use:

- Clean typography.
- Clear section hierarchy.
- Consistent spacing.
- Subtle use of one professional accent color.
- Strong but simple headings.
- Proper alignment.
- Comfortable line height.
- Appropriate margins.

Avoid:

- Excessive colors.
- Large graphical elements.
- Skill bars.
- Rating stars.
- Progress circles.
- Photos.
- Decorative backgrounds.
- Excessive icons.
- Complex layouts.

The design must prioritize readability and ATS compatibility over visual decoration.

========================
LENGTH
========================

Target approximately 1-2 pages when converted to PDF.

Do not remove important information simply to make the resume short.

Instead:

- Remove unnecessary repetition.
- Combine redundant bullets.
- Prioritize relevant experience.
- Keep bullets concise.
- Avoid unnecessarily verbose descriptions.

========================
HTML REQUIREMENTS
========================

Return complete HTML suitable for rendering with Puppeteer.

The HTML must include:

<!DOCTYPE html>
<html>
<head>
  ...
</head>
<body>
  ...
</body>
</html>

Include CSS inside a <style> tag in the <head>.

The HTML should be self-contained.

Do not depend on external CSS frameworks.

Do not depend on external JavaScript.

Do not use JavaScript unless absolutely necessary.

The resume should render correctly in a standard Chromium/Puppeteer environment.

Use print-friendly CSS such as:

@page {
  size: A4;
  margin: 12mm;
}

Also ensure:

- No unnecessary page backgrounds.
- No elements overflowing horizontally.
- No content being clipped.
- Page breaks should occur naturally.
- The resume should remain readable when printed to PDF.

========================
CONTENT PRIORITY
========================

When deciding what to emphasize, use this priority:

1. Directly relevant required JD skills supported by the resume.
2. Relevant professional experience.
3. Relevant projects.
4. Relevant technical skills.
5. Quantifiable achievements.
6. Education.
7. Less relevant information.

Do not remove important factual information merely because it is not explicitly mentioned in the JD.

========================
FINAL VALIDATION
========================

Before returning the result, internally verify:

- Every claim is supported by the provided candidate information.
- No technology has been falsely added.
- No experience has been invented.
- No metrics have been fabricated.
- The resume is tailored to the JD.
- Relevant JD terminology is used where truthfully applicable.
- The resume is ATS-friendly.
- The resume is concise.
- The HTML is valid and self-contained.
- The design is professional.
- The resume should fit within approximately 1-2 A4 pages.

========================
OUTPUT FORMAT
========================

Return ONLY valid JSON.

The JSON must contain exactly one property:

{
  "html": "..."
}

Do not return Markdown.

Do not use code fences.

Do not add explanations before or after the JSON.

The "html" property must contain the complete HTML resume as a string.
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }