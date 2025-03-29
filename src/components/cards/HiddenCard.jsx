// ./components/cards/HiddenCard.jsx
// Make sure it accepts cardData and uses animationDelay
import React from 'react';

const HiddenCard = ({ cardData, applyFoldedClassname }) => {
  // Use cardData.id for the key if available, otherwise fallback
  const key = cardData?.id || `${cardData?.suit}-${cardData?.cardFace}-${Math.random()}`;
  const animationDelay = cardData?.animationDelay || 0;

  return (
    <div
      key={key} // Use a unique key
      // Apply base playing-card styles AND robotcard styles
      className={`playing-card robotcard cardIn${applyFoldedClassname ? ' folded' : ''}`}
      style={{ animationDelay: `${applyFoldedClassname ? 0 : animationDelay}ms` }}
    >
      {/* Content is intentionally empty for a hidden card */}
    </div>
  );
};

export default HiddenCard;