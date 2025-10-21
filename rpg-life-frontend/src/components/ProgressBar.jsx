import React from 'react';

const ProgressBar = ({ current, max, label }) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;

  const containerStyles = {
    height: 25,
    width: '100%',
    backgroundColor: "var(--border-color)",
    borderRadius: 50,
    margin: '10px 0',
    position: 'relative',
    overflow: 'hidden',
  };

  const fillColor = '#646cff';

  const fillerStyles = {
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: fillColor,
    borderRadius: 'inherit',
    textAlign: 'right',
    transition: 'width 0.5s ease-in-out',
  };

  const labelStyles = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'var(--progressbar-text-color)',
    fontWeight: 'bold',
    textShadow: '0px 1px 2px rgba(0, 0, 0, 0.6)',
  };

  return (
    <div style={containerStyles}>
      <div style={fillerStyles}></div>
      <span style={labelStyles}>{label}</span>
    </div>
  );
};

export default ProgressBar;
