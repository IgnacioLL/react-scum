import React, { memo } from 'react';
import Card from './Card';

const TablePile = memo(({ cardsOnTable }) => {
  // If there are no cards, return an empty placeholder
  if (!cardsOnTable || cardsOnTable.length === 0) {
    return <div className="table-pile-container empty-pile"></div>;
  }

  // Simple stacking display for now
  return (
    <div className="table-pile-container">
      {cardsOnTable.map((card, index) => (
        <div
          key={`table-${card.id}-${index}`} // Use unique card ID
          className="table-card-wrapper"
          style={{
            position: 'absolute',
            left: `${(index * 25) - 50}px`, // Adjust overlap amount
            zIndex: index,
            transition: 'all 0.2s ease-in-out', // Smooth transition
            willChange: 'transform, opacity', // Performance hint
            backfaceVisibility: 'hidden', // Prevent flashing
            transform: 'translateZ(0)', // Force GPU acceleration
          }}
        >
          <Card
            cardData={card}
            isSelected={false} // Cards on table are not selectable
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