// ═══════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════
var _ac = null;
function getAC() { return _ac || (_ac = new (window.AudioContext || window.webkitAudioContext)()); }
function resumeAC() { try { if (_ac && _ac.state === 'suspended') _ac.resume(); } catch(_) {} }

function tone(freq, type, dur, vol, delay, freqEnd) {
  delay = delay || 0;
  try {
    const a = getAC(), t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch(_) {}
}

var sfx = {
  flap:      function() { tone(380,'sine',0.12,0.15); tone(250,'sine',0.08,0.07,0.05); },
  score:     function() { tone(880,'sine',0.1,0.2); tone(1320,'sine',0.1,0.15,0.1); },
  die:       function() { [300,200,130].forEach(function(f,i){ tone(f,'sawtooth',0.2,0.18,i*0.1); }); },
  clear:     function() { [523,659,784,1047].forEach(function(f,i){ tone(f,'sine',0.22,0.18,i*0.12); }); },
  emerald:   function() { [523,698,880,1175,1568].forEach(function(f,i){ tone(f,'sine',0.25,0.18,i*0.08); }); },
  transform: function() { [262,330,392,523,659,784,1047].forEach(function(f,i){ tone(f,'square',0.18,0.12,i*0.06); }); },
  shatter:   function() { tone(900,'sawtooth',0.04,0.3); tone(500,'sawtooth',0.08,0.2,0.04); tone(300,'sawtooth',0.12,0.15,0.08); },
  hyperTransform: function() { [262,330,392,523,659,784,1047,1319,1568].forEach(function(f,i){ tone(f,'square',0.15,0.14,i*0.05); }); },
  hyperEmerald: function() { [523,659,784,1047,1319,1568,2093].forEach(function(f,i){ tone(f,'sine',0.22,0.16,i*0.07); }); }
};
