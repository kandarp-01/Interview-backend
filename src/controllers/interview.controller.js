const pdfParse = require("pdf-parse");
const generateInterviewReport = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");


async function generateInterviewReportController(req, res) {
  const resumeFile = req.file;

  const parsedResume = await new pdfParse.PDFParse(
    Uint8Array.from(resumeFile.buffer)
  ).getText();

  const resumeContent = parsedResume.text;

  const {
    selfDescription,
    jobDescription,
  } = req.body;

  const interviewReportByAI = await generateInterviewReport({
    jobDescription,
    resume: resumeContent,
    selfDescription,
  });

  const interviewReport = await interviewReportModel.create({
    user: req.user.userId,
    resume: resumeContent,
    jobDescription,
    selfDescription,
    ...interviewReportByAI,
  });

  res.status(201).json({
    message: "Interview report generated successfully",
    interviewReport,
  });
}




module.exports = {generateInterviewReportController}