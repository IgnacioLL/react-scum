// ./components/players/Player.jsx
import React from 'react';
import Card from '../cards/Card';
import HiddenCard from '../cards/HiddenCard';
import PlayerStatusNotificationBox from "./PlayerStatusNotificationBox";

const Player = (props) => {
  const {
    player,
    isCurrentPlayer,
    isStillInRound,
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
    // *** REDUCED cardWidth for calculation ***
    const cardWidth = 24; // Reduced base width for calculation (adjust further if needed)
    const overlapFactor = 0.65; // Slightly less overlap might help too

    // Limit max overlap distance on very small screens indirectly by reducing cardWidth
    // A more complex solution might involve window.innerWidth checks, but start simple.

    return hand.map((card, index) => {
      const isSelected = !isHuman ? false : selectedCards && selectedCards.some(selCard => selCard.id === card.id);

      const centerIndex = (numCards - 1) / 2;
      const xOffset = (index - centerIndex) * (cardWidth * overlapFactor);

      // Card container style (absolute positioning)
      const cardContainerStyle = {
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transformOrigin: 'bottom center',
        zIndex: index,
        transform: `
          translateX(${xOffset - (cardWidth / 2)}px) /* Adjust X based on center */
          ${isSelected ? 'translateY(-10px)' : ''}`, // Reduced lift for smaller cards
        transition: 'transform 0.2s ease-out',
        // *** REMOVED fixed height/width - Let CSS control card size ***
        // height: '50px', // REMOVED
        // width: `${cardWidth}px`, // REMOVED - CSS will handle this via .playing-card/.robotcard
      };

      // Inner card style (takes full size of container)
      const cardInnerStyle = {
          height: '100%', // Takes height from CSS applied to parent
          width: '100%',  // Takes width from CSS applied to parent
          pointerEvents: 'auto',
      };


      if (!isHuman) {
        return (
          // Apply style to the container div which now relies on CSS for sizing
          <div key={card.id || `hidden-${index}`} style={cardContainerStyle} className="abscard">
            <div style={cardInnerStyle}>
                <HiddenCard
                  cardData={card}
                  applyFoldedClassname={false}
                />
            </div>
          </div>
        );
      } else {
        return (
          // Apply style to the container div which now relies on CSS for sizing
          <div key={card.id} style={cardContainerStyle} className="abscard">
             <div style={cardInnerStyle}>
                <Card
                  cardData={card}
                  isSelected={isSelected}
                  onClick={() => onCardClick(card)}
                  applyFoldedClassname={false}
                />
            </div>
          </div>
        );
      }
    });
  };

  const ifAnimating = (playerBoxIndex) => {
    return playerAnimationSwitchboard && playerAnimationSwitchboard[playerBoxIndex]?.isAnimating;
  }

  const activeStateClass = isStillInRound ? 'active-in-round' : 'inactive-in-round';
  const currentPlayerClass = isCurrentPlayer ? ' current-player-turn' : '';
  const currentNameClass = isCurrentPlayer ? ' current-player-name-highlight' : '';


  return (
    // Add 'player-entity-container' for potential future targeting if needed
    <div className={`player-entity--wrapper p${arrayIndex} ${activeStateClass} ${currentPlayerClass}`}>
      <div className="player-entity--top">
        <div className="player-avatar--container">
          {avatarURL && <img
            className={`player-avatar--image${(isCurrentPlayer ? ' activePlayer' : '')}`}
            src={avatarURL}
            alt="Player Avatar"
          />}
          <h5 className={`player-info--name ${currentNameClass}`}>
            {name} {player.isHuman ? '(You)' : ''} {player.role ? `(${player.role})` : ''}
          </h5>
          <div className="player-info--card-count">
            Cards: {hand ? hand.length : 0}
          </div>
           {player.finishedRank && <span className="player-info--rank">Rank: {player.finishedRank}</span>}
        </div>
        {playerAnimationSwitchboard && endTransition &&
          <PlayerStatusNotificationBox
            index={arrayIndex}
            isActive={ifAnimating(arrayIndex)}
            content={playerAnimationSwitchboard[arrayIndex]?.content || ''}
            endTransition={endTransition}
          />
        }
      </div>
      {/* Hand container's height/width will be controlled by CSS */}
      <div className='player-hand-container'>
        {renderPlayerCards()}
      </div>
    </div>
  );
};

export default Player;