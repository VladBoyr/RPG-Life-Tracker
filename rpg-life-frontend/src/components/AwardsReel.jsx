import React, { useState, useEffect, useRef } from 'react';
import './AwardsReel.css';

import img1 from '../assets/1.png';
import img2 from '../assets/2.png';
import img3 from '../assets/3.png';
import img4 from '../assets/4.png';
import img5 from '../assets/5.png';
import img6 from '../assets/6.png';

const awardImages = [img1, img2, img3, img4, img5, img6];

const AwardsReel = ({ availableItems, onSpinEnd }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelStyle, setReelStyle] = useState({});
  const [reelItems, setReelItems] = useState([]);
  const reelRef = useRef(null);

  const ITEM_WIDTH = 120;
  const ITEM_SPACING = 20;
  const TOTAL_ITEM_WIDTH = ITEM_WIDTH + ITEM_SPACING;

  useEffect(() => {
    if (availableItems.length > 0) {
      const extendedItems = [];
      for (let i = 0; i < 50; i++) {
        extendedItems.push(availableItems[i % availableItems.length]);
      }
      setReelItems(extendedItems);
    }
  }, [availableItems]);


  const startSpin = (wonItem) => {
    if (isSpinning || !reelRef.current) return;
    setIsSpinning(true);

    const wonItemIndexInReel = reelItems.findIndex((item, index) => item.id === wonItem.id && index > 20);

    const reelWidth = reelRef.current.offsetWidth;
    const targetPosition = (wonItemIndexInReel * TOTAL_ITEM_WIDTH) - (reelWidth / 2) + (ITEM_WIDTH / 2);

    setReelStyle({
      transform: `translateX(-${targetPosition}px)`,
      transition: 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)',
    });
    
    setTimeout(() => {
      setIsSpinning(false);
      onSpinEnd(wonItem);
      setTimeout(() => {
         setReelStyle({
            transform: 'translateX(0px)',
            transition: 'none',
         });
      }, 500);
    }, 5500);
  };

  useEffect(() => {
    window.triggerSpin = startSpin;
    return () => delete window.triggerSpin;
  }, [reelItems, isSpinning]);

  return (
    <div className="reel-container" ref={reelRef}>
      <div className="reel-mask">
        <div className="reel" style={reelStyle}>
          {reelItems.map((item, index) => (
            <div key={`${item.id}-${index}`} className="reel-item">
              <img src={awardImages[item.id % awardImages.length]} alt={item.name} />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
       <div className="reel-indicator"></div>
    </div>
  );
};

export default AwardsReel;
