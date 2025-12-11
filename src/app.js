(function () {
    // Check if the browser supports the Web Speech API
    if ('speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        let currentUtterance = null;
        let isPaused = false;

        // Get button and control elements
        const speakBtn = document.getElementById('speak-btn');
        const pauseResumeBtn = document.getElementById('pause-resume-btn');
        const stopBtn = document.getElementById('stop-btn');
        const speedButtons = document.querySelectorAll('.speed-btn');
        const voiceSelect = document.getElementById('voice-select');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const textDisplay = document.getElementById('text-display');
        const sentenceCount = document.getElementById('sentence-count');
        const currentSentence = document.getElementById('current-sentence');
        const totalSentences = document.getElementById('total-sentences');
        
        let currentSpeed = 1;
        let textChunks = [];
        let currentChunkIndex = 0;
        let availableVoices = [];
        let selectedVoice = null;

        // Load available voices
        function loadVoices() {
            availableVoices = synth.getVoices();
            voiceSelect.innerHTML = '';
            
            if (availableVoices.length === 0) {
                voiceSelect.innerHTML = '<option value="">No voices available</option>';
                return;
            }

            // Add default option
            voiceSelect.innerHTML = '<option value="">Default Voice</option>';
            
            // Group voices by gender/type
            const femaleVoices = [];
            const maleVoices = [];
            const otherVoices = [];
            
            availableVoices.forEach((voice, index) => {
                const voiceName = (voice.name || '').toLowerCase();
                if (voiceName.includes('female') || voiceName.includes('woman') || 
                    voiceName.includes('zira') || voiceName.includes('susan') || 
                    voiceName.includes('hazel') || voiceName.includes('samantha')) {
                    femaleVoices.push({ voice, index });
                } else if (voiceName.includes('male') || voiceName.includes('man') || 
                           voiceName.includes('david') || voiceName.includes('mark')) {
                    maleVoices.push({ voice, index });
                } else {
                    otherVoices.push({ voice, index });
                }
            });

            // Add female voices first
            if (femaleVoices.length > 0) {
                const femaleGroup = document.createElement('optgroup');
                femaleGroup.label = '👩 Female Voices';
                femaleVoices.forEach(({ voice, index }) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${voice.name} (${voice.lang})`;
                    femaleGroup.appendChild(option);
                });
                voiceSelect.appendChild(femaleGroup);
            }

            // Add male voices
            if (maleVoices.length > 0) {
                const maleGroup = document.createElement('optgroup');
                maleGroup.label = '👨 Male Voices';
                maleVoices.forEach(({ voice, index }) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${voice.name} (${voice.lang})`;
                    maleGroup.appendChild(option);
                });
                voiceSelect.appendChild(maleGroup);
            }

            // Add other voices
            if (otherVoices.length > 0) {
                const otherGroup = document.createElement('optgroup');
                otherGroup.label = '🔤 Other Voices';
                otherVoices.forEach(({ voice, index }) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${voice.name} (${voice.lang})`;
                    otherGroup.appendChild(option);
                });
                voiceSelect.appendChild(otherGroup);
            }
        }

        // Voice selection handler
        voiceSelect.addEventListener('change', function() {
            const selectedIndex = parseInt(this.value);
            selectedVoice = Number.isFinite(selectedIndex) && selectedIndex >= 0 ? availableVoices[selectedIndex] : null;
        });

        // Load voices when available
        if (synth.getVoices().length !== 0) {
            loadVoices();
        } else {
            synth.addEventListener('voiceschanged', loadVoices);
        }

        // Function to split text into chunks (sentences)
        function chunkText(text) {
            // Split by sentence-ending punctuation, keeping the punctuation
            const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
            return sentences.map(sentence => sentence.trim()).filter(sentence => sentence.length > 0);
        }

        // Function to create highlighted text display
        function createTextDisplay(chunks) {
            if (chunks.length === 0) {
                textDisplay.innerHTML = '<p style="color: #6c757d; font-style: italic; text-align: center;">Your text will appear here with live highlighting during speech...</p>';
                return;
            }

            let html = '';
            chunks.forEach((chunk, index) => {
                html += `<span class="sentence" data-index="${index}" onclick="jumpToSentence(${index})">${chunk}</span> `;
            });
            
            textDisplay.innerHTML = html;
            
            // Update stats
            sentenceCount.textContent = chunks.length;
            totalSentences.textContent = chunks.length;
            currentSentence.textContent = '0';
        }

        // Function to jump to a specific sentence
        function jumpToSentence(index) {
            if (synth.speaking && index >= 0 && index < textChunks.length) {
                currentChunkIndex = index;
                const wasPaused = isPaused;
                
                synth.cancel();
                setTimeout(() => {
                    updateTextHighlight();
                    speakCurrentChunk(wasPaused);
                }, 50);
            }
        }

        // Function to update text highlighting
        function updateTextHighlight() {
            const sentences = textDisplay.querySelectorAll('.sentence');
            
            sentences.forEach((sentence, index) => {
                sentence.classList.remove('current', 'completed');
                
                if (index < currentChunkIndex) {
                    sentence.classList.add('completed');
                } else if (index === currentChunkIndex) {
                    sentence.classList.add('current');
                    // Scroll to current sentence
                    sentence.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            
            // Update current sentence counter
            currentSentence.textContent = currentChunkIndex + 1;
        }

        // Update progress display
        function updateProgress() {
            if (textChunks.length === 0) {
                progressFill.style.width = '0%';
                progressText.textContent = 'Ready to speak';
                return;
            }
            
            const progress = ((currentChunkIndex) / textChunks.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Speaking sentence ${currentChunkIndex + 1} of ${textChunks.length}`;
            
            updateTextHighlight();
        }

        function updateButtonStates(speaking = false, paused = false) {
            speakBtn.disabled = speaking;
            pauseResumeBtn.disabled = !speaking;
            stopBtn.disabled = !speaking;
            
            // Update pause/resume button text and style
            if (paused) {
                pauseResumeBtn.textContent = 'Resume';
                pauseResumeBtn.classList.remove('pause-btn');
                pauseResumeBtn.classList.add('pause-btn', 'resume');
            } else {
                pauseResumeBtn.textContent = 'Pause';
                pauseResumeBtn.classList.remove('resume');
                pauseResumeBtn.classList.add('pause-btn');
            }
        }

        // Function to set active speed button
        function setActiveSpeedButton(speed) {
            speedButtons.forEach(btn => {
                btn.classList.remove('active');
                if (parseFloat(btn.dataset.speed) === speed) {
                    btn.classList.add('active');
                }
            });
        }

        // Function to handle speed changes
        function setSpeed(newSpeed) {
            currentSpeed = newSpeed;
            setActiveSpeedButton(newSpeed);
            
            // If currently speaking, restart only the current chunk with new speed
            if (currentUtterance && synth.speaking && textChunks.length > 0) {
                const wasPaused = isPaused;
                
                // Cancel current speech
                synth.cancel();
                
                // Restart current chunk with new speed
                setTimeout(() => {
                    speakCurrentChunk(wasPaused);
                }, 50);
            }
        }

        // Helper function to speak current chunk
        function speakCurrentChunk(shouldPause = false) {
            if (currentChunkIndex >= textChunks.length) {
                // Finished all chunks
                isPaused = false;
                updateButtonStates(false, false);
                currentUtterance = null;
                progressText.textContent = 'Finished speaking';
                return;
            }

            const chunk = textChunks[currentChunkIndex];
            currentUtterance = new SpeechSynthesisUtterance(chunk);
            currentUtterance.rate = Math.max(0.1, Math.min(10, currentSpeed));
            currentUtterance.pitch = 1;
            currentUtterance.volume = 1;
            
            // Set selected voice
            if (selectedVoice) {
                currentUtterance.voice = selectedVoice;
            }

            // Set up event handlers
            currentUtterance.onstart = function() {
                updateProgress();
                if (!shouldPause) {
                    isPaused = false;
                    updateButtonStates(true, false);
                }
            };

            currentUtterance.onend = function() {
                currentChunkIndex++;
                if (currentChunkIndex < textChunks.length) {
                    // Move to next chunk
                    setTimeout(() => speakCurrentChunk(), 100);
                } else {
                    // Finished all chunks
                    isPaused = false;
                    updateButtonStates(false, false);
                    currentUtterance = null;
                    currentChunkIndex = 0;
                    progressFill.style.width = '100%';
                    progressText.textContent = 'Finished speaking';
                }
            };

            currentUtterance.onerror = function(event) {
                console.error('Speech synthesis error:', event.error);
                isPaused = false;
                updateButtonStates(false, false);
                currentUtterance = null;
            };

            // Start speaking
            synth.speak(currentUtterance);
            
            // If it should be paused, pause it quickly
            if (shouldPause) {
                setTimeout(() => {
                    if (synth.speaking) {
                        synth.pause();
                        isPaused = true;
                        updateButtonStates(true, true);
                    }
                }, 50);
            }
        }

        function speakText() {
            const textInput = document.getElementById('text-input');
            const text = textInput.value.trim();

            if (text !== '') {
                // Stop any current speech
                if (synth.speaking) {
                    synth.cancel();
                }

                // Chunk the text into sentences
                textChunks = chunkText(text);
                currentChunkIndex = 0;
                
                // Create the text display with highlighting
                createTextDisplay(textChunks);
                
                // Start speaking from first chunk
                setTimeout(() => {
                    speakCurrentChunk();
                }, 50);
            } else {
                alert('Please enter some text to speak.');
            }
        }

        // Listen for text changes to update display
        document.getElementById('text-input').addEventListener('input', function() {
            const text = this.value.trim();
            if (text && !synth.speaking) {
                const chunks = chunkText(text);
                createTextDisplay(chunks);
            }
        });

        function togglePauseResume() {
            if (synth.speaking && !isPaused) {
                // Currently speaking, so pause immediately
                synth.pause();
                isPaused = true;
                updateButtonStates(true, true);
            } else if (isPaused) {
                // Currently paused, so resume immediately
                synth.resume();
                isPaused = false;
                updateButtonStates(true, false);
            }
        }

        function stopSpeech() {
            if (synth.speaking) {
                synth.cancel();
                isPaused = false;
                updateButtonStates(false, false);
                currentUtterance = null;
                currentChunkIndex = 0;
                progressFill.style.width = '0%';
                progressText.textContent = 'Stopped';
                
                // Reset highlighting
                const sentences = textDisplay.querySelectorAll('.sentence');
                sentences.forEach(sentence => {
                    sentence.classList.remove('current', 'completed');
                });
                currentSentence.textContent = '0';
            }
        }

        // Initialize button states
        updateButtonStates(false, false);

        // Expose functions used by inline HTML (onclick attributes) to the global scope
        window.jumpToSentence = jumpToSentence;
        window.setSpeed = setSpeed;
        window.speakText = speakText;
        window.togglePauseResume = togglePauseResume;
        window.stopSpeech = stopSpeech;
    } else {
        // Provide a fallback message for unsupported browsers
        alert('Your browser does not support the Web Speech API.');
    }
})();
