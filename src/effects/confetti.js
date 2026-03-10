import confetti from 'canvas-confetti';

/**
 * Fire a themed confetti burst from the center of the given element.
 * Uses the Space Journey gold/amber palette.
 *
 * @param {HTMLElement} [originEl] - Element to burst from. Falls back to center of screen.
 */
export function fireConfetti(originEl) {
  let origin = { x: 0.5, y: 0.5 };

  if (originEl) {
    const rect = originEl.getBoundingClientRect();
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }

  // First burst — gold/amber themed
  confetti({
    particleCount: 80,
    spread: 70,
    origin,
    colors: ['#f9a806', '#fbbf24', '#f59e0b', '#d97706', '#ffffff'],
    startVelocity: 30,
    gravity: 0.8,
    ticks: 120,
    shapes: ['star', 'circle'],
    scalar: 1.2,
  });

  // Second delayed burst — sparkle effect
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      origin,
      colors: ['#f9a806', '#fde68a', '#fffbeb', '#22c55e'],
      startVelocity: 20,
      gravity: 0.6,
      ticks: 100,
      shapes: ['star'],
      scalar: 0.8,
    });
  }, 200);
}

/**
 * A smaller sparkle effect for individual stroke completion.
 */
export function fireSparkle(originEl) {
  let origin = { x: 0.5, y: 0.5 };

  if (originEl) {
    const rect = originEl.getBoundingClientRect();
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }

  confetti({
    particleCount: 15,
    spread: 40,
    origin,
    colors: ['#f9a806', '#fbbf24'],
    startVelocity: 15,
    gravity: 1.2,
    ticks: 60,
    shapes: ['circle'],
    scalar: 0.6,
  });
}
