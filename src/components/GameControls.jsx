import React from 'react';

const GameControls = ({ onPlayClick, onPassClick, canPlay, canPass, playText = "Play Selected", onStopClick }) => {
  return (
    <div className="game-controls">
      <button
        className="action-button" // Reuse styles if desired
        onClick={onPlayClick}
        disabled={!canPlay}
      >
        {playText}
      </button>
      <button
        className="fold-button" // Reuse styles if desired, maybe rename class
        onClick={onPassClick}
        disabled={!canPass}
      >
        Pass
      </button>
    </div>
  );
};

export default GameControls;