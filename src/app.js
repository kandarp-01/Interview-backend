const express = require("express");
const authRouter = require("./routes/auth.routes");
const cookieParser = require("cookie-parser")
const cors = require('cors');
const interviewRouter = require("./routes/interview.routes")

const app = express();

app.use(express.json()); 
const allowedOrigins = [
  "http://localhost:5173",
  "https://interview-frontend-sable.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(cookieParser());
app.use("/api/auth",authRouter);
app.use("/api/interview",interviewRouter);




module.exports = app;