// ==============================================================================
// SERVER.JS - Express Backend for AI Text-to-Speech
// ==============================================================================
// This backend acts as a secure bridge between your frontend and ElevenLabs.
// It keeps your secret ELEVENLABS_API_KEY safely on the server side, ensuring
// it is never exposed in browser JavaScript.
// ==============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Loads environment variables from the .env file

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------------------------
// Middlewares
// ------------------------------------------------------------------------------
app.use(cors()); // Allows cross-origin requests if needed
app.use(express.json()); // Parses incoming JSON request bodies

// Serve static frontend files (HTML, CSS, JS, assets) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------------------------
// Predefined ElevenLabs Models & Popular Preset Voices
// ------------------------------------------------------------------------------
// These provide quick fallbacks and accurate metadata for beginner exploration.
const AVAILABLE_MODELS = [
  {
    id: 'eleven_multilingual_v2',
    name: 'Eleven Multilingual v2 (Recommended)',
    description: 'Most natural, emotionally rich speech across 29 languages.'
  },
  {
    id: 'eleven_flash_v2_5',
    name: 'Eleven Flash v2.5 (Fastest)',
    description: 'Ultra-low latency speech generation in 32 languages.'
  },
  {
    id: 'eleven_turbo_v2_5',
    name: 'Eleven Turbo v2.5 (Balanced)',
    description: 'High quality with low latency across 32 languages.'
  },
  {
    id: 'eleven_monolingual_v1',
    name: 'Eleven Monolingual v1 (English)',
    description: 'Classic, stable English narration model.'
  }
];

const PRESET_VOICES = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', desc: 'Warm & captivating storyteller (Male)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', desc: 'Mature, reassuring & confident (Female)' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', desc: 'Laid-back, casual & resonant (Male)' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', desc: 'Enthusiastic & quirky attitude (Female)' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', desc: 'Deep, confident & energetic (Male)' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', desc: 'Calm, clear & professional (Female)' }
];

// ------------------------------------------------------------------------------
// Endpoint: GET /api/health
// ------------------------------------------------------------------------------
// Check if the server is healthy and if the ElevenLabs API Key is present.
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim() !== '');
  res.json({
    status: 'ok',
    apiKeyConfigured: hasKey,
    message: hasKey
      ? 'Backend is online and ElevenLabs API key is configured.'
      : 'Backend is online, but ELEVENLABS_API_KEY is missing in your .env file.'
  });
});

// ------------------------------------------------------------------------------
// Endpoint: GET /api/models
// ------------------------------------------------------------------------------
// Returns the list of supported ElevenLabs text-to-speech models.
app.get('/api/models', (req, res) => {
  res.json({ models: AVAILABLE_MODELS });
});

// ------------------------------------------------------------------------------
// Endpoint: GET /api/voices
// ------------------------------------------------------------------------------
// Fetches voices directly from ElevenLabs or falls back to curated presets.
app.get('/api/voices', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.json({ voices: PRESET_VOICES, source: 'presets' });
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    });

    if (!response.ok) {
      console.warn('Could not fetch voices from ElevenLabs API, using preset voices.');
      return res.json({ voices: PRESET_VOICES, source: 'presets' });
    }

    const data = await response.json();
    const formattedVoices = (data.voices || []).map(v => ({
      id: v.voice_id,
      name: v.name,
      category: v.category || 'premade',
      desc: v.description || (v.labels ? Object.values(v.labels).join(', ') : 'ElevenLabs Voice')
    }));

    res.json({ voices: formattedVoices, source: 'api' });
  } catch (err) {
    console.error('Error fetching voices:', err.message);
    res.json({ voices: PRESET_VOICES, source: 'fallback' });
  }
});

// ------------------------------------------------------------------------------
// Endpoint: POST /api/text-to-speech
// ------------------------------------------------------------------------------
// Generates speech audio from text using the ElevenLabs API.
// 1. Receives text, model_id, voice_id from the frontend.
// 2. Validates inputs and API key.
// 3. Makes the secure server-to-server request to ElevenLabs.
// 4. Returns the MP3 audio stream to the frontend.
app.post('/api/text-to-speech', async (req, res) => {
  try {
    const { text, model_id, voice_id } = req.body;

    // Step 1: Input validation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Text is required. Please type or paste some text to generate speech.'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        error: 'Text length exceeds the 5,000 character limit for a single request.'
      });
    }

    // Step 2: Validate server environment variable
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_elevenlabs_api_key_here')) {
      return res.status(500).json({
        error: 'Missing ElevenLabs API Key on the server. Please add ELEVENLABS_API_KEY to your .env file.'
      });
    }

    // Step 3: Set fallback values if not provided
    const selectedVoiceId = voice_id || 'JBFqnCBsd6RMkjVDRZzb'; // George (warm storyteller)
    const selectedModelId = model_id || 'eleven_multilingual_v2';

    // Step 4: Make request to ElevenLabs Text-to-Speech API
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(selectedVoiceId)}`;

    const response = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: selectedModelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    // Step 5: Handle ElevenLabs API errors
    if (!response.ok) {
      let errorMessage = `ElevenLabs API error (HTTP ${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail && errorJson.detail.message) {
          errorMessage = errorJson.detail.message;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch (parseErr) {
        const errorText = await response.text();
        if (errorText) errorMessage += `: ${errorText}`;
      }

      console.error('ElevenLabs Error:', errorMessage);
      return res.status(response.status).json({ error: errorMessage });
    }

    // Step 6: Return the generated audio directly to frontend as MP3
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache'
    });

    return res.send(buffer);
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({
      error: `An unexpected server error occurred: ${error.message || 'Unknown error'}`
    });
  }
});

// ------------------------------------------------------------------------------
// Start the Express Server
// ------------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  AI Text-to-Speech Application is Running!`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  API Key Configured: ${process.env.ELEVENLABS_API_KEY ? 'YES (Loaded from .env)' : 'NO (Missing)'}`);
  console.log(`====================================================`);
});
