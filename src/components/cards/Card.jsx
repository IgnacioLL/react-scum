import React, { memo } from 'react';
import { renderUnicodeSuitSymbol } from '../../utils/ui'; // Keep this utility

const Card = memo((props) => {
  const {
    cardData, // Contains suit, cardFace, value, id, animationDelay
    isSelected, // New prop to indicate selection
    onClick, // New prop for handling clicks
    applyFoldedClassname // Keep for potential future use (like showing played cards fading out)
  } = props;

  // Basic validation
  if (!cardData || !cardData.suit || !cardData.cardFace) {
     // Render a placeholder or null if cardData is incomplete
     // This prevents errors if dealing isn't finished or data is bad
     // console.warn("Incomplete card data received:", cardData);
     return <div className="playing-card empty-card"></div>;
  }

  const { suit, cardFace, animationDelay } = cardData;

  // Determine card color
  const color = (suit === 'Diamond' || suit === 'Heart') ? 'red' : 'black';

  // Add 'selected' class if the card is selected
  const selectedClass = isSelected ? ' selected' : '';
  const foldedClass = applyFoldedClassname ? ' folded' : ''; // Keep folded animation possibility

  return (
    <div
      key={cardData.id} // Use the unique ID
      className={`playing-card cardIn${selectedClass}${foldedClass}`}
      style={{ 
        animationDelay: `${applyFoldedClassname ? 0 : animationDelay || 0}ms`,
        transition: 'all 0.2s ease-in-out', // Smooth transition
        willChange: 'transform, opacity', // Performance hint
        backfaceVisibility: 'hidden', // Prevent flashing
        transform: 'translateZ(0)' // Force GPU acceleration
      }}
      onClick={onClick} // Call the passed onClick handler
    >
      <h6 style={{ color: color }}>
        {`${cardFace} ${renderUnicodeSuitSymbol(suit)}`}
      </h6>
    </div>
  );
});

export default Card;