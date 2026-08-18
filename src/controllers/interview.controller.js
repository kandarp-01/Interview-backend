const pdfParse = require("pdf-parse");
const {generateInterviewReport,generateResumePdf} = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");
const { int } = require("zod");


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

async function getInterviewReportByIdController(req,res){
  const {interviewId} = req.params
  const interviewReport = await interviewReportModel.findOne({ _id:interviewId, user: req.user.userId})
  if(!interviewReport){
    return res.status(400).json({
      message:"Interview report not found"
    })
    
  }
  res.status(200).json({
      message:"Interview report fetched successfully",
      interviewReport
  })
}

async function getAllInterviewReportController(req, res) {
  const interviewReports = await interviewReportModel.find({user:req.user.userId}).sort({createdAt: -1}).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behaviouralQuestions -skillGaps -preparationPlan")
  if(!interviewReports){
    return res.status(400).json({
      message:"No interview report found"
    })
  }
  res.status(200).json({
    message:"Reports fetched succesfully",
    interviewReports
  })
}

async function generateResumePdfController(req,res){
  const {interviewReportId} = req.params;
  const interviewReport = await interviewReportModel.findById(interviewReportId);
  if(!interviewReport){
    return res.status(404).json({
      message:"Interview report not found."
    })
  }
  const {resume,selfDescription,jobDescription}= interviewReport;
  const pdfBuffer= await generateResumePdf({resume,jobDescription,selfDescription});
  res.set({
    "Content-Type": "application/pdf",
    "content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
  })
  res.send(pdfBuffer);
}



module.exports = {getAllInterviewReportController,generateInterviewReportController,getInterviewReportByIdController,generateResumePdfController}