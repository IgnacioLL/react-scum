// ./components/players/Player.jsx
import React from 'react';
import Card from '../cards/Card';
import HiddenCard from '../cards/HiddenCard'; // Import HiddenCard
import PlayerStatusNotificationBox from "./PlayerStatusNotificationBox";

const Player = (props) => {
  const {
    player,
    isCurrentPlayer,
    onCardClick,
    selectedCards,
    playerAnimationSwitchboard,
    endTransition,
    arrayIndex
  } = props;

  if (!player) return null;

  const { name, hand, isHuman, avatarURL } = player;

  const renderPlayerCards = () => {
    if (!hand) return null;

    const numCards = hand.length;
    const maxRotation = 45; // Max angle for the fan (degrees)
    const cardWidth = 25; // Approx width from CSS
    const baseYOffset = -10; // How much the fan is lifted

    return hand.map((card, index) => {
      const isSelected = !isHuman ? false : selectedCards && selectedCards.some(selCard => selCard.id === card.id);

      // Calculate position for fanning effect
      const centerIndex = (numCards - 1) / 2;
      const rotation = numCards > 1 ? (index - centerIndex) * (maxRotation / centerIndex) : 0;
      // Adjust Y offset to create an arc - more offset for outer cards
      const arcFactor = Math.abs(index - centerIndex);
      const yOffset = baseYOffset - (arcFactor * 1.5); // Adjust multiplier for more/less arc
      // Adjust X offset for horizontal spread
      const xOffset = (index - centerIndex) * (cardWidth * 0.8); // Increased multiplier
      
      const cardStyle = {
        position: 'absolute',
        zIndex: index, // Cards in middle overlap outer ones
        transform: `
          translateX(${xOffset}px)
          ${isSelected ? 'translateY(-15px)' : ''}`,
        transition: 'transform 0.2s ease-out', // Smooth selection animation
      };

      if (!isHuman) {
        // Render HiddenCard for non-human players
        return (
          <div key={card.id} style={cardStyle}>
            <HiddenCard
              cardData={card} // Pass card data even if not fully used visually
              applyFoldedClassname={false}
            />
          </div>
        );
      } else {
        // Render regular Card for human player
        return (
          <div key={card.id} style={cardStyle}>
            <Card
              cardData={card}
              isSelected={isSelected}
              onClick={() => onCardClick(card)}
              applyFoldedClassname={false}
            />
          </div>
        );
      }
    });
  };

  const ifAnimating = (playerBoxIndex) => {
    return playerAnimationSwitchboard && playerAnimationSwitchboard[playerBoxIndex]?.isAnimating;
  }

  return (
    <div className={`player-entity--wrapper p${arrayIndex}`}>
      {playerAnimationSwitchboard && endTransition &&
        <PlayerStatusNotificationBox
          index={arrayIndex}
          isActive={ifAnimating(arrayIndex)}
          content={playerAnimationSwitchboard[arrayIndex]?.content || ''}
          endTransition={endTransition}
        />
      }
      {/* Container for the fanned cards */}
      <div className='abscard player-hand-container'> {/* Added class */}
        {renderPlayerCards()}
      </div>
      {/* Player Info */}
      <div className="player-entity--container">
        <div className="player-avatar--container">
          {avatarURL && <img
            className={`player-avatar--image${(isCurrentPlayer ? ' activePlayer' : '')}`}
            src={avatarURL}
            alt="Player Avatar"
          />}
          <h5 className="player-info--name"> {/* Removed inline style, control via CSS */}
            {name}
          </h5>
          {/* Card count is now positioned via CSS */}
          <div className="player-info--card-count">
            Cards: {hand ? hand.length : 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;