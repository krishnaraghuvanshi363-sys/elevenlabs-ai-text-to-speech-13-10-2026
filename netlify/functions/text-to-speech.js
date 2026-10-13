// ==============================================================================
// NETLIFY SERVERLESS FUNCTION: text-to-speech.js
// ==============================================================================
// Path: netlify/functions/text-to-speech.js
// This function executes securely in Netlify's serverless environment.
// It retrieves ELEVENLABS_API_KEY from Netlify's environment variables dashboard
// and proxies the request to ElevenLabs API without exposing keys to clients.
// ==============================================================================

exports.handler = async (event, context) => {
  // Set CORS headers for browser security
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Ensure request method is POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  try {
    // 1. Verify that the ElevenLabs API Key is present in Netlify Environment Variables
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'ELEVENLABS_API_KEY is not configured in Netlify Site Settings > Environment Variables.'
        })
      };
    }

    // 2. Parse request body
    let bodyData;
    try {
      bodyData = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON request body.' })
      };
    }

    const { text, model_id, voice_id } = bodyData;

    // 3. Validate input text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Text field is required and cannot be empty.' })
      };
    }

    const selectedVoiceId = voice_id || 'JBFqnCBsd6RMkjVDRZzb'; // Default voice (George)
    const selectedModelId = model_id || 'eleven_multilingual_v2';

    // 4. Send request to ElevenLabs Text-to-Speech API
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

    // 5. Handle potential ElevenLabs API errors
    if (!response.ok) {
      let errMessage = `ElevenLabs API error (HTTP ${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail && errorJson.detail.message) {
          errMessage = errorJson.detail.message;
        } else if (errorJson.message) {
          errMessage = errorJson.message;
        }
      } catch (err) {
        const rawText = await response.text();
        if (rawText) errMessage += `: ${rawText}`;
      }

      return {
        statusCode: response.status,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errMessage })
      };
    }

    // 6. Return binary audio as base64 encoded string
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"'
      },
      body: base64Audio,
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('Serverless function error:', err);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: `Serverless execution error: ${err.message || 'Unknown error'}`
      })
    };
  }
};
