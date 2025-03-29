// ./components/players/Player.jsx
import React from 'react';
import Card from '../cards/Card';
import HiddenCard from '../cards/HiddenCard';
import PlayerStatusNotificationBox from "./PlayerStatusNotificationBox"; // Ensure this is imported

const Player = (props) => {
  const {
    player,
    isCurrentPlayer,
    isStillInRound, // NEW: Prop to indicate if player is active in the current trick/round
    onCardClick,
    selectedCards,
    playerAnimationSwitchboard, // For 'Passed' notification
    endTransition,             // For 'Passed' notification
    arrayIndex
  } = props;

  if (!player) return null;

  const { name, hand, isHuman, avatarURL } = player;

  const renderPlayerCards = () => {
    // ... (card rendering logic remains the same) ...
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
          <div key={card.id || `hidden-${index}`} style={cardStyle}> {/* Added fallback key */}
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

  // Check if the specific player has an active animation
  const ifAnimating = (playerBoxIndex) => {
    return playerAnimationSwitchboard && playerAnimationSwitchboard[playerBoxIndex]?.isAnimating;
  }

  // Add 'active-in-round' class if the player is still playing in this sequence
  const activeRoundClass = isStillInRound ? ' active-in-round' : '';
  // Add 'current-player-turn' class if it's their turn
  const currentPlayerClass = isCurrentPlayer ? ' current-player-turn' : '';


  return (
    // Add the activeRoundClass here
    <div className={`player-entity--wrapper p${arrayIndex}${activeRoundClass}${currentPlayerClass}`}>
      {/* Player Status Notification (for 'Passed') */}
      {playerAnimationSwitchboard && endTransition &&
        <PlayerStatusNotificationBox
          index={arrayIndex}
          isActive={ifAnimating(arrayIndex)}
          content={playerAnimationSwitchboard[arrayIndex]?.content || ''}
          endTransition={endTransition} // Pass the handler down
        />
      }
      {/* Container for the fanned cards */}
      <div className='abscard player-hand-container'>
        {renderPlayerCards()}
      </div>
      {/* Player Info */}
      <div className="player-entity--container">
        <div className="player-avatar--container">
          {avatarURL && <img
            // Use isCurrentPlayer for the avatar border highlight
            className={`player-avatar--image${(isCurrentPlayer ? ' activePlayer' : '')}`}
            src={avatarURL}
            alt="Player Avatar"
          />}
          <h5 className="player-info--name">
            {name}
          </h5>
          <div className="player-info--card-count">
            Cards: {hand ? hand.length : 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;