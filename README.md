# AI Text-to-Speech Web Application (Powered by ElevenLabs)

A beginner-friendly, secure, and modern web application that converts text into natural, lifelike spoken audio using the **ElevenLabs Text-to-Speech API**.

Designed for classroom activities, university demonstrations, and introductory web development projects.

---

## 🌟 Features

- **Modern Glassmorphic UI**: High-contrast, responsive dark theme built with HTML, Vanilla CSS, and JavaScript.
- **Model Selector**: Choose between ElevenLabs models (`Eleven Multilingual v2`, `Eleven Flash v2.5`, `Eleven Turbo v2.5`, `Eleven Monolingual v1`).
- **Voice Selector**: Pick from voice personas (George, Sarah, Rachel, Charlie, Roger, Laura).
- **Sample Prompts & Quick Actions**: Click preset pills (Welcome, Future AI, Storytelling) for quick testing or clear text with one click.
- **Input Validation**: Verifies that text is provided before sending API calls.
- **Anti-Spam Button Protection**: Automatically disables the Generate button while an audio request is in progress.
- **Audio Wave Loading Indicator**: Visual animation indicating neural voice synthesis is underway.
- **In-Browser Audio Player**: Native player with play/pause, time scrubber, and one-click MP3 download button.
- **Secure Backend Bridge**: **Never exposes the secret ElevenLabs API key in the browser**. All requests pass through a backend or serverless function.
- **Dual Deployment Ready**: Runs locally with Node.js Express (`server.js`) AND deploys directly to Netlify with Serverless Functions (`netlify/functions/text-to-speech.js`).

---

## 📁 Project Structure

```
elevenlabs-13-10-26/
├── .env                       # Local secrets (stores ELEVENLABS_API_KEY - DO NOT COMMIT!)
├── .env.example               # Template showing required environment variables
├── .gitignore                 # Prevents .env and node_modules from uploading to GitHub
├── package.json               # Node.js dependencies and scripts
├── server.js                  # Local Express server (API proxy & static file server)
├── netlify.toml               # Netlify configuration & API route redirects
├── netlify/
│   └── functions/
│       └── text-to-speech.js  # Netlify Serverless Function (for cloud deployment)
├── public/
│   ├── index.html             # Clean HTML5 interface
│   ├── style.css              # Custom responsive stylesheet & animations
│   └── app.js                 # Frontend interactions & API communication
└── README.md                  # Complete documentation and setup guide
```

---

## 🔒 Security Architecture (Why We Use a Backend)

```
[User Browser]
      │
      │ 1. Sends Text & Model (POST /api/text-to-speech)
      ▼
[Secure Backend Server or Netlify Function]
      │
      │ 2. Reads ELEVENLABS_API_KEY from environment
      │ 3. Attaches header 'xi-api-key'
      ▼
[ElevenLabs API (api.elevenlabs.io)]
      │
      │ 4. Returns Audio Stream (audio/mpeg)
      ▼
[Secure Backend Server]
      │
      │ 5. Streams MP3 back to Browser
      ▼
[Browser HTML5 Audio Player]
```

> **Why this matters**: If you put your API key in frontend JavaScript (`public/app.js`), anyone can open Chrome DevTools, inspect the source, and steal your ElevenLabs credits. By putting it in `.env` and calling it from `server.js` or Netlify functions, your secret key stays completely safe!

---

## 🚀 How to Run the Project Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

### Step 1: Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```

### Step 2: Add Your ElevenLabs API Key Locally
Create or open the `.env` file in the root folder and add your key:
```env
ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here
PORT=3000
```
*(Your provided API key is already configured in `.env`)*

### Step 3: Start the Local Server
```bash
npm start
```
Or with auto-restart on file changes:
```bash
npm run dev
```

### Step 4: Open in Your Browser
Open your browser and visit:
```text
http://localhost:3000
```

---

## ☁️ How to Deploy to Netlify

Netlify allows you to host this project completely free using its built-in serverless functions.

### Step 1: Push Code to GitHub
Make sure `.env` is NOT pushed to GitHub (our `.gitignore` already takes care of this).
```bash
git init
git add .
git commit -m "Initial commit - AI Text-to-Speech"
git branch -M main
git remote add origin https://github.com/your-username/your-repo-name.git
git push -u origin main
```

### Step 2: Connect Repository to Netlify
1. Log in to [Netlify](https://www.netlify.com/).
2. Click **"Add new site"** -> **"Import an existing project"**.
3. Select **GitHub** and choose your repository.

### Step 3: Enter Your API Key in Netlify
1. In the Netlify setup screen (or under **Site configuration > Environment variables**):
2. Click **"Add a variable"**.
3. **Key**: `ELEVENLABS_API_KEY`
4. **Value**: Paste your ElevenLabs API key (`sk_a029...`).
5. Click **"Save"**.

### Step 4: Deploy!
Click **"Deploy site"**. Netlify will automatically:
- Serve your frontend from the `public/` folder.
- Deploy `netlify/functions/text-to-speech.js` as an API route.
- Route requests from `/api/text-to-speech` to the serverless function according to `netlify.toml`.

---

## 🧪 Testing the Application

1. Open `http://localhost:3000`.
2. Click the **"Welcome"** sample pill or type your own sentence.
3. Select a model (e.g., `Eleven Multilingual v2`).
4. Select a voice (e.g., `George` or `Sarah`).
5. Click **"Generate Speech"**.
6. The audio will synthesize in 1–3 seconds, display in the player, auto-play, and provide an MP3 download button.
