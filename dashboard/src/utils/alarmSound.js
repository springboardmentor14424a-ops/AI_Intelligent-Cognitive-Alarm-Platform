// Web Audio API Alarm Sound Synthesizer
// Provides realistic alarm beeps, REM sync sound ramping, gentle chimes, and alert tones without external audio assets

let audioCtx = null;
let alarmOscillator = null;
let alarmGain = null;
let soundInterval = null;

export const playAlarmSound = (soundType = 'REM Sync') => {
  stopAlarmSound(); // Ensure any running sound is stopped first

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    alarmGain = audioCtx.createGain();
    alarmGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    alarmGain.connect(audioCtx.destination);

    if (soundType === 'Voice Prompt' || soundType === 'Chimes') {
      // Gentle Chime Pulsing Tone (Frequency 587Hz D5 -> 880Hz A5)
      let freqToggle = false;
      soundInterval = setInterval(() => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freqToggle ? 880 : 587.33;
        freqToggle = !freqToggle;
        
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }, 600);

    } else if (soundType === 'Gentle Tone') {
      // Soft Ramping Sine Wave
      soundInterval = setInterval(() => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }, 800);

    } else {
      // Standard / REM Sync Alarm Beep (Double Beep Pattern)
      let beepState = 0;
      soundInterval = setInterval(() => {
        if (!audioCtx) return;
        if (beepState === 0 || beepState === 1) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.value = 880; // A5 pitch

          gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        }
        beepState = (beepState + 1) % 4; // 2 beeps, then pause
      }, 250);
    }

    console.log(`🔔 Alarm Sound Playing: ${soundType}`);
  } catch (e) {
    console.error('AudioContext sound initialization error:', e);
  }
};

export const stopAlarmSound = () => {
  if (soundInterval) {
    clearInterval(soundInterval);
    soundInterval = null;
  }
  if (alarmGain && audioCtx) {
    try {
      alarmGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    } catch (e) {}
  }
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (e) {}
    audioCtx = null;
  }
  console.log('🔇 Alarm Sound Stopped');
};
