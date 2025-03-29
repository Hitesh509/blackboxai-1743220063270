// Enhanced gesture mappings for virtual mouse
const GESTURES = {
  // Cursor movement gesture (index finger extended)
  POINTING: {
    action: "MOVE",
    description: "Index finger extended for cursor control",
    detect: (landmarks) => {
      const indexTip = landmarks[8];
      const indexDip = landmarks[7];
      const middleTip = landmarks[12];
      const thumbTip = landmarks[4];
      
      // Index finger extended and others folded
      return indexTip.y < indexDip.y && 
             Math.abs(indexTip.x - middleTip.x) > 0.1 &&
             Math.abs(thumbTip.x - indexTip.x) > 0.15;
    }
  },

  // Click gesture (pinch between thumb and index)
  PINCH: {
    action: "CLICK",
    description: "Pinch between thumb and index finger",
    detect: (landmarks) => {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const distance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2)
      );
      return distance < 0.05; // Threshold for pinch detection
    }
  },

  // Right-click gesture (fist)
  FIST: {
    action: "RIGHT_CLICK",
    description: "Closed fist for right click",
    detect: (landmarks) => {
      const fingerTips = [4, 8, 12, 16, 20];
      const fingerBases = [2, 5, 9, 13, 17];
      let isFist = true;
      
      for (let i = 0; i < 5; i++) {
        const tipY = landmarks[fingerTips[i]].y;
        const baseY = landmarks[fingerBases[i]].y;
        if (tipY < baseY) { // Fingers should be folded downward
          isFist = false;
          break;
        }
      }
      return isFist;
    }
  },

  // Scroll up/down gestures (swipe motions)
  SWIPE_UP: {
    action: "SCROLL_UP",
    description: "Upward swipe motion",
    detect: (landmarks, prevLandmarks) => {
      if (!prevLandmarks) return false;
      const wrist = landmarks[0];
      const prevWrist = prevLandmarks[0];
      return (wrist.y - prevWrist.y) < -0.1; // Upward motion threshold
    }
  },

  SWIPE_DOWN: {
    action: "SCROLL_DOWN",
    description: "Downward swipe motion",
    detect: (landmarks, prevLandmarks) => {
      if (!prevLandmarks) return false;
      const wrist = landmarks[0];
      const prevWrist = prevLandmarks[0];
      return (wrist.y - prevWrist.y) > 0.1; // Downward motion threshold
    }
  }
};

// Maintain previous landmarks for motion detection
let previousLandmarks = null;

// Export for use in app.js
export { GESTURES, previousLandmarks };
