import React, { memo } from 'react';
import Card from './Card';

const TablePile = memo(({ cardsOnTable }) => {
  // If there are no cards, return an empty placeholder
  if (!cardsOnTable || cardsOnTable.length === 0) {
    return <div className="table-pile-container empty-pile"></div>;
  }

  // Calculate a reasonable overlap based on number of cards and screen size
  const calculateOffset = (index, total) => {
    let baseOffset;
    
    // Adjust spacing based on screen size
    if (window.innerWidth >= 1200) {
      // Large screens - more spacing
      baseOffset = total <= 3 ? 45 : 35;
    } else if (window.innerWidth <= 480) {
      // Mobile - slightly more spacing for better visibility
      baseOffset = total <= 3 ? 25 : 18; // Increased from 20/15
    } else {
      // Tablets - medium spacing
      baseOffset = total <= 3 ? 35 : 25;
    }
    
    // Center the cards by calculating the starting position
    const startPosition = -(total - 1) * baseOffset / 2;
    // Return the position for this specific card
    return startPosition + (index * baseOffset);
  };

  return (
    <div className="table-pile-container">
      {cardsOnTable.map((card, index) => (
        <div
          key={`table-${card.id}-${index}`}
          className="table-card-wrapper"
          style={{
            position: 'absolute',
            left: '50%',
            transform: `translateX(${calculateOffset(index, cardsOnTable.length)}px)`,
            zIndex: index,
            transition: 'all 0.2s ease-in-out',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden'
          }}
        >
          <Card
            cardData={card}
            isSelected={false}
            applyFoldedClassname={false}
          />
        </div>
      ))}
      {/* Add a label */}
      <div style={{ position: 'absolute', top: '-50px', left: '0', color: 'white', fontSize: '12px', width: '100%', textAlign: 'center' }}>
         Current Pile
      </div>
    </div>
  );
});

export default TablePile;