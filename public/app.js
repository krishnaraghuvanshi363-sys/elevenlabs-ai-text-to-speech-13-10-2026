// ==============================================================================
// APP.JS - Frontend Logic for AI Text-to-Speech
// ==============================================================================
// This file coordinates user interactions, input validation, communication
// with our secure backend API, and browser audio playback.
// Every section is commented to serve as a beginner-friendly classroom guide.
// ==============================================================================

// Run script once DOM is completely loaded
document.addEventListener('DOMContentLoaded', () => {

  // ----------------------------------------------------------------------------
  // 1. Element References
  // ----------------------------------------------------------------------------
  const ttsForm = document.getElementById('ttsForm');
  const textInput = document.getElementById('textInput');
  const modelSelect = document.getElementById('modelSelect');
  const voiceSelect = document.getElementById('voiceSelect');
  const generateBtn = document.getElementById('generateBtn');
  const charCounter = document.getElementById('charCounter');
  const clearTextBtn = document.getElementById('clearTextBtn');
  const samplePills = document.querySelectorAll('.sample-pill');
  const modelDesc = document.getElementById('modelDesc');

  // Loading & Audio Display Elements
  const loadingIndicator = document.getElementById('loadingIndicator');
  const audioSection = document.getElementById('audioSection');
  const audioPlayer = document.getElementById('audioPlayer');
  const downloadAudioBtn = document.getElementById('downloadAudioBtn');
  const audioMeta = document.getElementById('audioMeta');

  // Alert Banners
  const errorBanner = document.getElementById('errorBanner');
  const errorMessage = document.getElementById('errorMessage');
  const dismissErrorBtn = document.getElementById('dismissErrorBtn');
  const successBanner = document.getElementById('successBanner');

  // Button States (Normal vs Spinner)
  const defaultState = generateBtn.querySelector('.default-state');
  const loadingState = generateBtn.querySelector('.loading-state');

  // Keep track of the current audio object URL to release memory when replaced
  let currentAudioUrl = null;

  // Model Descriptions Map (Updates hint below dropdown)
  const MODEL_DESCRIPTIONS = {
    'eleven_multilingual_v2': 'Our most natural, emotionally rich mode across 29 languages.',
    'eleven_flash_v2_5': 'Ultra-low latency speech generation in 32 languages.',
    'eleven_turbo_v2_5': 'High quality with low latency across 32 languages.',
    'eleven_monolingual_v1': 'Classic English-only narration model.'
  };

  // ----------------------------------------------------------------------------
  // 2. Character Counter & Input Handling
  // ----------------------------------------------------------------------------
  function updateCharCount() {
    const count = textInput.value.length;
    const max = textInput.getAttribute('maxlength') || 5000;
    charCounter.textContent = `${count.toLocaleString()} / ${parseInt(max).toLocaleString()} characters`;

    // Dynamic styling when approaching limit
    if (count > 4500) {
      charCounter.className = 'char-counter danger';
    } else if (count > 3500) {
      charCounter.className = 'char-counter warning';
    } else {
      charCounter.className = 'char-counter';
    }
  }

  // Update count on user keystrokes / pastes
  textInput.addEventListener('input', () => {
    updateCharCount();
    // Clear error message if user starts typing after an error
    if (!errorBanner.classList.contains('hidden')) {
      hideError();
    }
  });

  // Clear Text Button
  clearTextBtn.addEventListener('click', () => {
    textInput.value = '';
    textInput.focus();
    updateCharCount();
    hideError();
  });

  // Sample prompt pills (clickable shortcuts for quick classroom testing)
  samplePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const sampleText = pill.getAttribute('data-sample');
      if (sampleText) {
        textInput.value = sampleText;
        updateCharCount();
        textInput.focus();
        hideError();
      }
    });
  });

  // Update Model Description when model selection changes
  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    if (MODEL_DESCRIPTIONS[selectedModel]) {
      modelDesc.textContent = MODEL_DESCRIPTIONS[selectedModel];
    }
  });

  // ----------------------------------------------------------------------------
  // 3. UI Alert Helpers (Error & Success)
  // ----------------------------------------------------------------------------
  function showError(msg) {
    errorMessage.textContent = msg || 'An unexpected error occurred.';
    errorBanner.classList.remove('hidden');
    successBanner.classList.add('hidden');
    // Scroll error banner into view if not visible
    errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorBanner.classList.add('hidden');
  }

  function showSuccess(msg) {
    if (msg) document.getElementById('successMessage').textContent = msg;
    successBanner.classList.remove('hidden');
    errorBanner.classList.add('hidden');
  }

  dismissErrorBtn.addEventListener('click', hideError);

  // ----------------------------------------------------------------------------
  // 4. Loading State Toggle
  // ----------------------------------------------------------------------------
  function setLoading(isLoading) {
    if (isLoading) {
      // Disable Generate button to prevent accidental duplicate requests (Requirement 9)
      generateBtn.disabled = true;
      defaultState.classList.add('hidden');
      loadingState.classList.remove('hidden');

      // Show animated wave loading indicator (Requirement 2 & 7)
      loadingIndicator.classList.remove('hidden');

      // Hide banners
      hideError();
      successBanner.classList.add('hidden');
    } else {
      // Restore Generate button
      generateBtn.disabled = false;
      defaultState.classList.remove('hidden');
      loadingState.classList.add('hidden');

      // Hide wave loading indicator
      loadingIndicator.classList.add('hidden');
    }
  }

  // ----------------------------------------------------------------------------
  // 5. Form Submission & ElevenLabs API Call
  // ----------------------------------------------------------------------------
  ttsForm.addEventListener('submit', async (e) => {
    // Prevent normal browser page reload
    e.preventDefault();

    const textToSynthesize = textInput.value.trim();
    const selectedModel = modelSelect.value;
    const selectedVoice = voiceSelect.value;
    const selectedVoiceName = voiceSelect.options[voiceSelect.selectedIndex]?.text.split(' - ')[0] || 'Selected Voice';
    const selectedModelName = modelSelect.options[modelSelect.selectedIndex]?.text.split(' (')[0] || selectedModel;

    // Requirement 8: Validate that text field is not empty before making API request
    if (!textToSynthesize) {
      showError('Please enter some text in the box above before generating speech.');
      textInput.focus();
      return;
    }

    // Activate loading mode
    setLoading(true);

    try {
      // Step A: Send request to our backend server
      // Note: We use relative path "/api/text-to-speech".
      // - In local development: handled by Express in server.js
      // - On Netlify: redirected to Netlify Serverless Function via netlify.toml
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: textToSynthesize,
          model_id: selectedModel,
          voice_id: selectedVoice
        })
      });

      // Step B: Check for HTTP errors from the server or ElevenLabs API
      if (!response.ok) {
        let serverError = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            serverError = errorData.error;
          }
        } catch (jsonErr) {
          // If response wasn't JSON, read plain text
          const rawText = await response.text();
          if (rawText) serverError = rawText;
        }
        throw new Error(serverError);
      }

      // Step C: Receive the audio binary data (MP3) as a Blob
      const audioBlob = await response.blob();

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Received an empty audio response from the server.');
      }

      // Step D: Free previously allocated memory URL if one existed
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
      }

      // Step E: Create a browser URL pointing to the downloaded audio Blob
      currentAudioUrl = URL.createObjectURL(audioBlob);

      // Step F: Connect audio URL to audio player and download button
      audioPlayer.src = currentAudioUrl;
      downloadAudioBtn.href = currentAudioUrl;
      downloadAudioBtn.download = `speech-${Date.now()}.mp3`;

      // Update metadata text
      audioMeta.textContent = `Model: ${selectedModelName} • Voice: ${selectedVoiceName} • Size: ${(audioBlob.size / 1024).toFixed(1)} KB`;

      // Display audio player section
      audioSection.classList.remove('hidden');
      showSuccess('Voice generated successfully! Enjoy listening.');

      // Automatically play the generated speech audio
      try {
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
          playPromise.catch((playbackErr) => {
            // Autoplay may be restricted by browser policy until user clicks play
            console.log('Autoplay deferred by browser policy. Click Play to listen.');
          });
        }
      } catch (err) {
        console.warn('Auto-playback note:', err);
      }

    } catch (error) {
      console.error('TTS Generation Error:', error);

      // Display helpful, user-friendly error message
      let friendlyMessage = error.message;

      // Provide extra hints for common beginner configuration issues
      if (friendlyMessage.includes('Failed to fetch') || friendlyMessage.includes('NetworkError')) {
        friendlyMessage = 'Could not connect to the backend server. Make sure "npm start" is running in your terminal!';
      } else if (friendlyMessage.includes('Missing ElevenLabs API Key')) {
        friendlyMessage = 'ELEVENLABS_API_KEY is missing on the server. Please check your .env file or Netlify settings.';
      }

      showError(friendlyMessage);
    } finally {
      // Step G: Always re-enable button when request finishes
      setLoading(false);
    }
  });

  // ----------------------------------------------------------------------------
  // 6. Optional: Dynamic Voice Loader (Enhancement)
  // ----------------------------------------------------------------------------
  // Attempts to fetch the user's custom voices from the backend on initial load.
  // If unavailable or offline, the HTML preset voices remain seamlessly intact.
  async function loadDynamicVoices() {
    try {
      const response = await fetch('/api/voices');
      if (!response.ok) return;

      const data = await response.json();
      if (data && data.voices && data.voices.length > 0) {
        // Save currently selected voice id
        const previousVoice = voiceSelect.value;
        voiceSelect.innerHTML = '';

        data.voices.forEach(voice => {
          const option = document.createElement('option');
          option.value = voice.id;
          option.textContent = `${voice.name}${voice.desc ? ` - ${voice.desc}` : ''}`;
          if (voice.id === previousVoice) {
            option.selected = true;
          }
          voiceSelect.appendChild(option);
        });

        // If previous choice wasn't matched, select first option
        if (!voiceSelect.value && voiceSelect.options.length > 0) {
          voiceSelect.selectedIndex = 0;
        }
      }
    } catch (e) {
      // Silent fallback: Keep standard static options from index.html
      console.log('Using default preset voices.');
    }
  }

  // Trigger optional dynamic voice fetch
  loadDynamicVoices();
  updateCharCount();
});
