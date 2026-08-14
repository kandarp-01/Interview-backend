const { GoogleGenAI }=require("@google/genai");
const {z}=require('zod')
const {zodToJsonSchema} = require("zod-to-json-schema")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const interviewReportSchema = z.object({
    matchScore: z.number().min(0).max(100).description("The match score between the candidate and the job description, ranging from 0 to 100"),
    technicalQuestions: z.array(z.object({
        question: z.string().description("The technical question can be asked during the interview"),
        intention: z.string().description("The intention of interviewer behind the technical question"),
        answer: z.string().description("How to answer this question, what points to cover, what approach to take etc."),
    })).description("List of technical questions that can be asked during the interview along with their intention and answer"),
    behaviouralQuestions: z.array(z.object({
        question: z.string().description("The behavioural question can be asked during the interview"),
        intention: z.string().description("The intention of interviewer behind the behavioural question"),
        answer: z.string().description("How to answer this question, what points to cover, what approach to take etc."),
    })).description("List of behavioural questions that can be asked during the interview along with their intention and answer"),
    skillGaps: z.array(z.object({
        skill: z.string().description("The skill that the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).description("The severity of the skill gap"),
    })).description("List of skill gaps that the candidate has along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().description("The day number of the preparation plan to follow"),
        focus: z.string().description("The focus of the preparation plan for that day"),
        tasks: z.array(z.string()).description("The tasks to be completed for that day"),
    })).description("List of topics that the candidate should prepare for along with their resources"),
})

async function generateInterviewReport(jobDescription, resume, selfDescription) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "",
        config: {
            responseMimeType: "application/json",
            jsonSchema: zodToJsonSchema(interviewReportSchema),