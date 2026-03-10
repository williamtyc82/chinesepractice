import HanziWriter from 'hanzi-writer';
import { fireConfetti } from '../effects/confetti.js';
/**
 * HanziBox — A handwriting practice component using HanziWriter.
 * Supports high-precision stylus input via Pointer Events.
 *
 * @param {HTMLElement} containerEl - The DOM element to mount into.
 * @param {string} character - The Chinese character to practice.
 * @param {object} [options] - Additional configuration.
 * @returns {object} Controller with reset(), setCharacter(), getWriter() methods.
 */
export function createHanziBox(containerEl, character, options = {}) {
  // Clear existing content
  containerEl.innerHTML = '';

  // === Pointer Events CSS for Stylus Support ===
  containerEl.style.touchAction = 'none';       // Prevent browser scroll/zoom on touch
  containerEl.style.userSelect = 'none';         // No text selection
  containerEl.style.webkitUserSelect = 'none';
  containerEl.style.cursor = 'crosshair';

  // Get container dimensions
  const rect = containerEl.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height) || 300;

  // Theme colors matching the Space Journey UI
  const theme = {
    strokeColor: '#4a3520',
    outlineColor: 'rgba(249, 168, 6, 0.15)',
    drawingColor: '#f9a806',
    highlightColor: '#f9a806',
    highlightCompleteColor: '#22c55e',
    ...options.theme,
  };

  // === Create HanziWriter Instance ===
  const writer = HanziWriter.create(containerEl, character, {
    width: size,
    height: size,
    padding: 20,
    showCharacter: false,
    showOutline: true,
    strokeAnimationSpeed: 1.2,
    strokeHighlightSpeed: 2,
    delayBetweenStrokes: 800,
    strokeColor: theme.strokeColor,
    outlineColor: theme.outlineColor,
    drawingColor: theme.drawingColor,
    highlightColor: theme.highlightColor,
    highlightCompleteColor: theme.highlightCompleteColor,
    drawingWidth: 6,
    showHintAfterMisses: 3,
    highlightOnComplete: true,
    renderer: 'svg',
    ...options.writerOptions,
  });

  // State tracking
  let totalMistakes = 0;
  let isQuizActive = false;

  /**
   * Start the quiz mode with callbacks for strokes.
   */
  function startQuiz() {
    totalMistakes = 0;
    isQuizActive = true;

    // Add active class for visual feedback
    containerEl.classList.add('hanzi-quiz-active');

    writer.quiz({
      onCorrectStroke: (strokeData) => {
        // Sparkle effect on correct stroke
        _pulseContainer();
        if (options.onCorrectStroke) {
          options.onCorrectStroke(strokeData);
        }
      },

      onMistake: (strokeData) => {
        totalMistakes = strokeData.totalMistakes;
        // Subtle shake on mistake
        _shakeContainer();
        if (options.onMistake) {
          options.onMistake(strokeData);
        }
      },

      onComplete: async (summaryData) => {
        isQuizActive = false;
        containerEl.classList.remove('hanzi-quiz-active');

        // 🎉 Fire confetti!
        fireConfetti(containerEl);

        if (options.onComplete) {
          options.onComplete({ ...summaryData, stars: _calculateStars(summaryData.totalMistakes) });
        }
      },
    });
  }

  /**
   * Calculate star rating (1–5) based on mistakes.
   */
  function _calculateStars(mistakes) {
    if (mistakes === 0) return 5;
    if (mistakes <= 2) return 4;
    if (mistakes <= 5) return 3;
    if (mistakes <= 10) return 2;
    return 1;
  }

  /**
   * Green pulse animation on correct stroke.
   */
  function _pulseContainer() {
    containerEl.classList.add('hanzi-correct-pulse');
    setTimeout(() => containerEl.classList.remove('hanzi-correct-pulse'), 400);
  }

  /**
   * Shake animation on mistake.
   */
  function _shakeContainer() {
    containerEl.classList.add('hanzi-mistake-shake');
    setTimeout(() => containerEl.classList.remove('hanzi-mistake-shake'), 500);
  }

  /**
   * Reset the quiz for the current character.
   */
  function reset() {
    writer.hideCharacter();
    writer.showOutline();
    startQuiz();
  }

  /**
   * Switch to a new character.
   */
  function setCharacter(newChar) {
    writer.setCharacter(newChar);
    character = newChar;
    reset();
  }

  /**
   * Show the stroke order animation.
   */
  function showAnimation() {
    writer.cancelQuiz();
    isQuizActive = false;
    containerEl.classList.remove('hanzi-quiz-active');
    writer.showCharacter();
    writer.animateCharacter({
      onComplete: () => {
        writer.hideCharacter();
        startQuiz();
      },
    });
  }

  // === Pointer Events Enhancement for Stylus ===
  // These provide high-precision tracking data for Apple Pencil / S-Pen
  containerEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'pen') {
      // Capture the pointer for consistent tracking
      containerEl.setPointerCapture(e.pointerId);
    }
  }, { passive: true });

  containerEl.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'pen' && e.pressure > 0) {
      // Log high-precision stylus data (can be used for pressure-sensitive rendering)
      // HanziWriter handles the actual stroke matching internally
    }
  }, { passive: true });

  // Auto-start quiz
  startQuiz();

  return {
    reset,
    setCharacter,
    showAnimation,
    startQuiz,
    getWriter: () => writer,
    isActive: () => isQuizActive,
  };
}
