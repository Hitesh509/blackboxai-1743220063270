// Virtual Mouse Implementation
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const log = document.getElementById('log');
const startBtn = document.getElementById('startBtn');

// Import gestures (using relative path with .js extension)
import { GESTURES, previousLandmarks } from './gestures.js';

// Make Hands available globally since MediaPipe loads separately
const Hands = window.Hands;

// Virtual cursor element
const cursor = document.createElement('div');
cursor.id = 'virtual-cursor';
document.body.appendChild(cursor);

// Mouse state tracking
let isDragging = false;
let lastPosition = { x: 0, y: 0 };
let smoothPosition = { x: 0, y: 0 };

// MediaPipe Hands setup
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

// Camera setup
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 1280,
        height: 720,
        facingMode: 'user'
      }
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        resolve();
      };
    });
  } catch (err) {
    log.textContent = `Error: ${err.message}`;
    throw err;
  }
}

// Smooth cursor movement and state
function updateCursorPosition(x, y) {
  // Apply smoothing filter (weighted average)
  smoothPosition.x = smoothPosition.x * 0.7 + x * 0.3;
  smoothPosition.y = smoothPosition.y * 0.7 + y * 0.3;
  
  cursor.style.left = `${smoothPosition.x}px`;
  cursor.style.top = `${smoothPosition.y}px`;
  cursor.style.opacity = '1';
}

// Update cursor visual states based on actions
function updateCursorState(action) {
  cursor.className = '';
  cursor.classList.add('virtual-cursor');
  
  switch(action) {
    case 'CLICK':
      cursor.classList.add('click');
      setTimeout(() => cursor.classList.remove('click'), 200);
      break;
    case 'RIGHT_CLICK':
      cursor.classList.add('active');
      setTimeout(() => cursor.classList.remove('active'), 200);
      break;
    case 'SCROLL_UP':
    case 'SCROLL_DOWN':
      cursor.classList.add('active');
      setTimeout(() => cursor.classList.remove('active'), 300);
      break;
  }
}

// Dispatch mouse events
function dispatchMouseEvent(type, x, y) {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    view: window
  });
  
  const element = document.elementFromPoint(x, y);
  if (element) element.dispatchEvent(event);
}

// Detection loop
function detectHands() {
  hands.send({ image: video }).then((results) => {
    if (results.multiHandLandmarks) {
      drawHands(results.multiHandLandmarks);
      
      if (results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const wrist = landmarks[0];
        
        // Calculate screen position (invert x-axis for mirror effect)
        const screenX = (1 - wrist.x) * window.innerWidth;
        const screenY = wrist.y * window.innerHeight;
        
        // Update cursor position
        updateCursorPosition(screenX, screenY);
        
        // Detect gestures
        for (const [gestureName, gesture] of Object.entries(GESTURES)) {
          if (gesture.detect(landmarks, previousLandmarks)) {
            log.textContent = `Detected: ${gestureName}`;
            
            switch(gesture.action) {
              case 'MOVE':
                if (isDragging) {
                  dispatchMouseEvent('mousemove', screenX, screenY);
                }
                break;
                
              case 'CLICK':
                updateCursorState('CLICK');
                dispatchMouseEvent('mousedown', screenX, screenY);
                setTimeout(() => dispatchMouseEvent('mouseup', screenX, screenY), 100);
                break;
                
              case 'RIGHT_CLICK':
                updateCursorState('RIGHT_CLICK');
                dispatchMouseEvent('contextmenu', screenX, screenY);
                break;
                
              case 'SCROLL_UP':
                updateCursorState('SCROLL_UP');
                window.scrollBy(0, -50);
                break;
                
              case 'SCROLL_DOWN':
                updateCursorState('SCROLL_DOWN');
                window.scrollBy(0, 50);
                break;
            }
            break;
          }
        }
        
        previousLandmarks = landmarks;
      } else {
        log.textContent = 'No hands detected';
        cursor.style.opacity = '0.3';
      }
    }
    requestAnimationFrame(detectHands);
  });
}

// Draw hand landmarks
function drawHands(landmarks) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Draw landmarks
  landmarks.forEach(landmark => {
    ctx.fillStyle = '#00FF00';
    landmark.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  });
}

// Initialize app with detailed error logging
startBtn.addEventListener('click', async () => {
  try {
    log.textContent = 'Initializing camera...';
    await initCamera();
    log.textContent = 'Camera ready. Loading hand detection...';
    
    hands.onResults((results) => {
      try {
        detectHands(results);
      } catch (err) {
        console.error('Detection error:', err);
        log.textContent = `Detection error: ${err.message}`;
      }
    });
    
    startBtn.disabled = true;
    log.textContent = 'Virtual mouse ready! Show your hand to the camera.';
    console.log('MediaPipe Hands initialized successfully');
  } catch (err) {
    console.error('Initialization failed:', err);
    log.textContent = `Error: ${err.message}`;
    
    if (err.name === 'NotAllowedError') {
      log.textContent += '\nPlease allow camera access and try again.';
    } else if (err.name === 'NotFoundError') {
      log.textContent += '\nNo camera found. Please check your device.';
    }
  }
});

// Add cursor styles dynamically
const style = document.createElement('style');
style.textContent = `
  #virtual-cursor {
    position: fixed;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(0, 255, 0, 0.7);
    border: 2px solid white;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: opacity 0.2s, transform 0.1s;
  }
`;
document.head.appendChild(style);
