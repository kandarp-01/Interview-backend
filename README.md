# Interview Preparation Backend API

This API generates interview preparation reports from a candidate's resume, job description, and self-description. It also provides user authentication, saved report access, and tailored resume PDF downloads.

- Base URL: `http://localhost:3000`
- Authentication routes prefix: `/api/auth`
- Interview routes prefix: `/api/interview`

## Running the Backend

- Node.js 18 or newer
- MongoDB
- Redis
- A Google Gemini API key

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` file in the `backend` folder:

```env
MONGO_URI=mongodb://127.0.0.1:27017/interview-preparation
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_GENAI_API_KEY=your-google-genai-api-key
```

3. Start MongoDB and Redis.

4. Start the server:

```bash
npm run dev
```

The server runs on port `3000` by default. Login creates an HTTP-only `token` cookie. Send this cookie with protected requests; browser clients must enable credentials. Protected endpoints do not use an `Authorization` bearer token.

## API Reference

Base URL: `http://localhost:3000`

### `POST /api/auth/register`

Creates a user. No authentication required.

Request JSON:

```json
{
  "username": "ada",
  "email": "ada@example.com",
  "password": "correct-horse-battery-staple"
}
```

Success (`201`):

```json
{
  "message": "user registered successfully",
  "user": {
    "id": "665f1a2b3c4d5e6f78901234",
    "username": "ada",
    "email": "ada@example.com"
  }
}
```

Missing fields or an existing username/email returns `400` with a `message`.

### `POST /api/auth/login`

Logs in with either a username or an email. No authentication required.

Request JSON:

```json
{
  "username": "ada@example.com",
  "password": "correct-horse-battery-staple"
}
```

Success (`201`) returns a `Set-Cookie` header and JSON:

```json
{
  "message": "User logged in successfully",
  "token": "<jwt>"
}
```

Invalid credentials or missing fields returns `400`. The protected API uses the cookie, not the returned token as a bearer token.

### `POST /api/auth/logout`

Ends the session using the `token` cookie. No auth middleware is attached, but a token is required.

Example:

```bash
curl -i -X POST http://localhost:3000/api/auth/logout \
  -H 'Cookie: token=<jwt>'
```

Success (`200`):

```json
{
  "message": "User logged out successfully"
}
```

If no cookie or bearer token is supplied, the response is `400` with `Token is missing`.

### `GET /api/auth/get-me`

Returns the authenticated user. Requires the login cookie.

Example:

```bash
curl http://localhost:3000/api/auth/get-me \
  -H 'Cookie: token=<jwt>'
```

Success (`200`):

```json
{
  "message": "User fetched successfully",
  "user": {
    "userId": "665f1a2b3c4d5e6f78901234",
    "username": "ada",
    "email": "ada@example.com"
  }
}
```

### `POST /api/interview/`

Generates and stores an interview report. Requires the login cookie and a `multipart/form-data` request.

Form fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `resume` | File | Yes | PDF resume, maximum 3 MB. |
| `jobDescription` | String | Yes in practice | Target job description. |
| `selfDescription` | String | Yes in practice | Candidate's self-description. |

Example:

```bash
curl -X POST http://localhost:3000/api/interview/ \
  -H 'Cookie: token=<jwt>' \
  -F 'resume=@./resume.pdf' \
  -F 'jobDescription=Backend engineer experienced with Node.js and REST APIs' \
  -F 'selfDescription=I build API services and enjoy debugging distributed systems.'
```

Success (`201`) returns the stored report:

```json
{
  "message": "Interview report generated successfully",
  "interviewReport": {
    "_id": "665f1a2b3c4d5e6f78901234",
    "user": "665f1a2b3c4d5e6f78901234",
    "jobDescription": "...",
    "resume": "Extracted text from the PDF...",
    "selfDescription": "...",
    "title": "Backend Engineer",
    "matchScore": 82,
    "technicalQuestions": [],
    "behaviouralQuestions": [],
    "skillGaps": [],
    "preparationPlan": [],
    "createdAt": "2026-08-19T12:00:00.000Z",
    "updatedAt": "2026-08-19T12:00:00.000Z"
  }
}
```

The AI response is generated before the report is saved. Upload, PDF parsing, AI, and database failures are currently handled by Express's default error behavior.

### `GET /api/interview/report/:interviewId`

Returns one report belonging to the authenticated user.

Example:

```bash
curl http://localhost:3000/api/interview/report/665f1a2b3c4d5e6f78901234 \
  -H 'Cookie: token=<jwt>'
```

Success (`200`):

```json
{
  "message": "Interview report fetched successfully",
  "interviewReport": { "_id": "665f1a2b3c4d5e6f78901234" }
}
```

The object contains the complete report schema described below. A missing report returns `400` with `Interview report not found`.

### `GET /api/interview/`

Returns the authenticated user's reports, newest first. Requires the login cookie. Large source fields and detailed question/plan fields are deliberately excluded from this list response.

Example:

```bash
curl http://localhost:3000/api/interview/ \
  -H 'Cookie: token=<jwt>'
```

Success (`200`):

```json
{
  "message": "Reports fetched succesfully",
  "interviewReports": [
    {
      "_id": "665f1a2b3c4d5e6f78901234",
      "user": "665f1a2b3c4d5e6f78901234",
      "title": "Backend Engineer",
      "matchScore": 82,
      "createdAt": "2026-08-19T12:00:00.000Z",
      "updatedAt": "2026-08-19T12:00:00.000Z"
    }
  ]
}
```

### `POST /api/interview/resume/pdf/:interviewReportId`

Generates a tailored resume PDF from an existing report. Requires the login cookie.

Example:

```bash
curl -X POST \
  http://localhost:3000/api/interview/resume/pdf/665f1a2b3c4d5e6f78901234 \
  -H 'Cookie: token=<jwt>' \
  -o tailored-resume.pdf
```

Success (`200`) returns binary PDF data with:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename=resume_665f1a2b3c4d5e6f78901234.pdf
```

If the report ID does not exist, the response is `404` with `Interview report not found.`

## Interview Report Schema

| Field | Type | Rules |
| --- | --- | --- |
| `jobDescription` | String | Required. |
| `resume` | String | Required; extracted PDF text. |
| `selfDescription` | String | Required. |
| `title` | String | Required; extracted from the job description by Gemini. |
| `matchScore` | Number | Required, from 0 through 100. |
| `technicalQuestions` | Array | At least one item. |
| `behaviouralQuestions` | Array | At least one item. |
| `skillGaps` | Array | Defaults to an empty array. |
| `preparationPlan` | Array | Exactly seven items. |
| `user` | MongoDB ObjectId | Links the report to its owner. |
| `createdAt`, `updatedAt` | Date | Added automatically by Mongoose timestamps. |

Each item in `technicalQuestions` and `behaviouralQuestions` has:

```json
{
  "question": "...",
  "intention": "...",
  "answer": "..."
}
```

Each `skillGaps` item has:

```json
{
  "skill": "Node.js",
  "severity": "low"
}
```

`severity` is one of `low`, `medium`, or `high`.

Each `preparationPlan` item has:

```json
{
  "day": 1,
  "focus": "Express fundamentals",
  "tasks": ["Review routing", "Build a small API"]
}
```

`day` must be from 1 through 7, and `tasks` must contain at least one string.
