import React from 'react';
import Card from './Card';

const TablePile = ({ cardsOnTable }) => {
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
            left: `${index * 15}px`, // Adjust overlap amount
            top: `${index * 2}px`,   // Slight vertical offset
            zIndex: index,
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
      <div style={{ position: 'absolute', top: '-20px', left: '0', color: 'white', fontSize: '12px', width: '100%', textAlign: 'center' }}>
         Current Pile
      </div>
    </div>
  );
};

export default TablePile;