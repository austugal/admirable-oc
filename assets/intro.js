// Aperture cinematic boot - vanilla JS, bulletproof button
(function() {
  'use strict';

  var intro = document.getElementById('intro');
  if (!intro) {
    document.body.classList.remove('intro-active');
    return;
  }

  // Skip if already entered this session
  if (sessionStorage.getItem('apertureEntered') === '1') {
    intro.style.display = 'none';
    document.body.classList.remove('intro-active');
    return;
  }

  var enterBtn = document.getElementById('intro-enter');
  var statusList = document.getElementById('status-list');
  var coords = document.getElementById('boot-coords');
  var clock = document.getElementById('boot-clock');
  var systemInfo = document.getElementById('boot-system');

  // Lock body scroll while intro visible (mobile - stops library showing underneath)
  document.body.classList.add('intro-active');

  // ============================================
  // 1. AUDIO - whoosh on load + ticks per status
  // ============================================
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var audioCtx = null;
  var audioUnlocked = false;
  function initAudio() {
    if (!audioCtx) {
      try { audioCtx = new AudioCtx(); } catch(e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    // iOS unlock - play a silent buffer
    if (audioCtx && !audioUnlocked) {
      try {
        var buffer = audioCtx.createBuffer(1, 1, 22050);
        var source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
      } catch(e) {}
    }
    audioUnlocked = true;
  }
  function playWhoosh() {
    if (!audioCtx) return;
    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.6);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now); osc.stop(now + 0.7);
  }
  function playTick(freq) {
    if (!audioCtx) return;
    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq || 880;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now); osc.stop(now + 0.13);
  }

  // ============================================
  // 2. CLOCK - Lisbon time, ticking
  // ============================================
  function pad(n){ return n < 10 ? '0' + n : '' + n; }
  function updateClock() {
    if (!clock) return;
    var d = new Date();
    var hh = pad(d.getUTCHours() + (isLisbonDST(d) ? 1 : 0));
    var mm = pad(d.getUTCMinutes());
    var ss = pad(d.getUTCSeconds());
    if (parseInt(hh) >= 24) hh = pad(parseInt(hh) - 24);
    clock.textContent = hh + ':' + mm + ':' + ss + ' WET · LISBON';
  }
  function isLisbonDST(d) {
    // Last Sunday of March to Last Sunday of October
    var year = d.getUTCFullYear();
    var marchLast = new Date(Date.UTC(year, 2, 31));
    marchLast.setUTCDate(31 - marchLast.getUTCDay());
    var octLast = new Date(Date.UTC(year, 9, 31));
    octLast.setUTCDate(31 - octLast.getUTCDay());
    return d >= marchLast && d < octLast;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ============================================
  // 3. SYSTEM INFO + COORDS reveal
  // ============================================
  if (coords) coords.textContent = '38.7223° N · 9.1393° W';
  if (systemInfo) systemInfo.innerHTML = 'APERTURE ENGINE · v0.2<br>ORACLE OPERA CLOUD · LATEST<br>BUILD ' + new Date().toISOString().slice(0,10).replace(/-/g,'');

  // ============================================
  // 4. STATUS SEQUENCE - one line per topic
  // ============================================
  var statuses = [
    { txt: 'INITIALISING APERTURE CORE', tick: 660 },
    { txt: 'CONNECTING LISBON · 38.72°N 9.14°W', tick: 720 },
    { txt: 'CONNECTING MELBOURNE · 37.81°S 144.96°E', tick: 760 },
    { txt: 'LOADING ORACLE OPERA CLOUD REFERENCE', tick: 800 },
    { txt: 'INDEXING PMS MODULES', tick: 840 },
    { txt: 'INDEXING FISCAL EXPORTS · PT · ES', tick: 880 },
    { txt: 'INDEXING BACK OFFICE EXPORTS · SUN · SAP', tick: 920 },
    { txt: 'LOADING ORACLE VIDEO TUTORIAL INDEX', tick: 980 },
    { txt: 'LOADING OXI XML INTEGRATION SAMPLES', tick: 1020 },
    { txt: 'CHECKING TRADEMARK COMPLIANCE', tick: 1060 },
    { txt: 'APERTURE READY · ALL SYSTEMS ONLINE', tick: 1200, done: true }
  ];

  var idx = 0;
  function nextStatus() {
    if (idx >= statuses.length) {
      if (enterBtn) {
        enterBtn.disabled = false;
        enterBtn.classList.add('ready');
      }
      return;
    }
    var s = statuses[idx];
    var li = document.createElement('div');
    li.className = 'status-line' + (s.done ? ' done' : '');
    li.innerHTML = '<span class="status-dot"></span><span class="status-txt">' + s.txt + '</span><span class="status-ok">OK</span>';
    if (statusList) statusList.appendChild(li);
    setTimeout(function(){ li.classList.add('active'); playTick(s.tick); }, 50);
    idx++;
    setTimeout(nextStatus, 380);
  }

  // ============================================
  // 5. GLOBE - canvas-based rotating wireframe
  // ============================================
  var canvas = document.getElementById('boot-globe');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width = 320;
    var H = canvas.height = 320;
    var cx = W/2, cy = H/2, R = 120;
    var rotation = 0;
    var arcs = [
      // Primary arc - Lisbon to Melbourne (the dual-base)
      { from: { lat: 38.72, lng: -9.14 }, to: { lat: -37.81, lng: 144.96 }, color: '#c44e2c', name: 'LIS-MEL', primary: true },
      { from: { lat: -37.81, lng: 144.96 }, to: { lat: 38.72, lng: -9.14 }, color: '#c44e2c', name: 'MEL-LIS', primary: true },
      // Secondary connections from Lisbon
      { from: { lat: 38.72, lng: -9.14 }, to: { lat: 40.42, lng: -3.70 }, color: '#007a8a', name: 'LIS-MAD' },
      { from: { lat: 38.72, lng: -9.14 }, to: { lat: 51.51, lng: -0.13 }, color: '#007a8a', name: 'LIS-LON' },
      { from: { lat: 38.72, lng: -9.14 }, to: { lat: 50.11, lng: 8.68 }, color: '#007a8a', name: 'LIS-FRA' },
      // Secondary from Melbourne
      { from: { lat: -37.81, lng: 144.96 }, to: { lat: -33.87, lng: 151.21 }, color: '#007a8a', name: 'MEL-SYD' },
      { from: { lat: -37.81, lng: 144.96 }, to: { lat: 1.35, lng: 103.82 }, color: '#007a8a', name: 'MEL-SIN' }
    ];

    function project(lat, lng, rot) {
      var phi = (90 - lat) * Math.PI / 180;
      var theta = (lng + rot) * Math.PI / 180;
      var x = R * Math.sin(phi) * Math.cos(theta);
      var y = R * Math.cos(phi);
      var z = R * Math.sin(phi) * Math.sin(theta);
      return { x: cx + x, y: cy - y, z: z };
    }

    function drawGlobe() {
      ctx.clearRect(0, 0, W, H);

      // Outer pulsing ring
      var pulse = Math.sin(rotation * 0.05) * 0.3 + 0.7;
      ctx.strokeStyle = 'rgba(196, 78, 44, ' + (0.25 * pulse) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 20, 0, Math.PI * 2);
      ctx.stroke();

      // Sphere wireframe - latitude lines
      ctx.strokeStyle = 'rgba(29, 41, 57, 0.18)';
      ctx.lineWidth = 1;
      for (var lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        for (var lng = -180; lng <= 180; lng += 5) {
          var p = project(lat, lng, rotation);
          if (lng === -180) ctx.moveTo(p.x, p.y);
          else if (p.z > -20) ctx.lineTo(p.x, p.y);
          else { ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
        }
        ctx.stroke();
      }
      // Longitude lines
      for (var lng2 = 0; lng2 < 360; lng2 += 30) {
        ctx.beginPath();
        for (var lat2 = -90; lat2 <= 90; lat2 += 5) {
          var p2 = project(lat2, lng2, rotation);
          if (lat2 === -90) ctx.moveTo(p2.x, p2.y);
          else if (p2.z > -20) ctx.lineTo(p2.x, p2.y);
          else { ctx.stroke(); ctx.beginPath(); ctx.moveTo(p2.x, p2.y); }
        }
        ctx.stroke();
      }

      // Equator highlight
      ctx.strokeStyle = 'rgba(196, 78, 44, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var lng3 = -180; lng3 <= 180; lng3 += 3) {
        var pe = project(0, lng3, rotation);
        if (lng3 === -180) ctx.moveTo(pe.x, pe.y);
        else if (pe.z > -20) ctx.lineTo(pe.x, pe.y);
      }
      ctx.stroke();

      // Lisbon hub - always visible front
      var lisbon = project(38.72, -9.14, rotation);
      if (lisbon.z > -50) {
        ctx.fillStyle = '#c44e2c';
        ctx.beginPath();
        ctx.arc(lisbon.x, lisbon.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(196, 78, 44, ' + (0.6 - (rotation % 60) / 60 * 0.6) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lisbon.x, lisbon.y, 4 + (rotation % 60) / 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Melbourne hub - dual base
      var melbourne = project(-37.81, 144.96, rotation);
      if (melbourne.z > -50) {
        ctx.fillStyle = '#c44e2c';
        ctx.beginPath();
        ctx.arc(melbourne.x, melbourne.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(196, 78, 44, ' + (0.6 - ((rotation + 30) % 60) / 60 * 0.6) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(melbourne.x, melbourne.y, 4 + ((rotation + 30) % 60) / 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Connection arcs (animated draw)
      var progress = Math.min(rotation / 100, 1);
      arcs.forEach(function(a, i) {
        if (progress < i * 0.1) return;
        var arcProg = Math.min((progress - i * 0.1) / 0.6, 1);
        var p1 = project(a.from.lat, a.from.lng, rotation);
        var p2 = project(a.to.lat, a.to.lng, rotation);
        if (p1.z > -50 && p2.z > -50) {
          ctx.strokeStyle = a.color;
          ctx.globalAlpha = a.primary ? 0.85 : 0.55;
          ctx.lineWidth = a.primary ? 2 : 1.2;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          var mx = (p1.x + p2.x) / 2;
          var my = (p1.y + p2.y) / 2 - (a.primary ? 60 : 30);
          var endX = p1.x + (p2.x - p1.x) * arcProg;
          var endY = p1.y + (p2.y - p1.y) * arcProg;
          ctx.quadraticCurveTo(mx, my, endX, endY);
          ctx.stroke();
          if (arcProg >= 1) {
            ctx.fillStyle = a.color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, a.primary ? 3 : 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      });

      rotation += 0.4;
      requestAnimationFrame(drawGlobe);
    }
    drawGlobe();
  }

  // ============================================
  // 6. ENTER FUNCTION - bulletproof
  // ============================================
  function enterSite() {
    sessionStorage.setItem('apertureEntered', '1');
    initAudio();
    playWhoosh();
    intro.classList.add('fading');
    setTimeout(function() {
      intro.style.display = 'none';
      document.body.classList.remove('intro-active');
    }, 800);
  }

  // Multiple bindings for safety
  if (enterBtn) {
    enterBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!enterBtn.disabled) enterSite();
    });
  }

  document.addEventListener('keydown', function(e) {
    if (intro && intro.style.display !== 'none' && !intro.classList.contains('fading')) {
      if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') && enterBtn && !enterBtn.disabled) {
        e.preventDefault();
        enterSite();
      }
    }
  });

  // Start sequence: whoosh + status reveal
  if (enterBtn) enterBtn.disabled = true;
  setTimeout(function() {
    initAudio();
    playWhoosh();
    setTimeout(nextStatus, 400);
  }, 300);

  // First user interaction unlocks audio
  document.addEventListener('click', initAudio, { once: true });
})();
