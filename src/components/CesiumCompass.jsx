import React, { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import compassUrl from '../assets/compass.png';

const COMPASS_IMAGE_URL = compassUrl;

const CesiumCompass = ({ viewer }) => {
  const [compassRotation, setCompassRotation] = useState(0);

  useEffect(() => {
    if (!viewer) return;

    const updateCompass = () => {
      // 1. 獲取當前攝像頭的航向 (弧度轉角度)
      // Cesium 的 heading 是 0~360，我們取負值因為指針旋轉方向與地圖相反
      const heading = -Cesium.Math.toDegrees(viewer.camera.heading);

      setCompassRotation(prevRotation => {
        // 2. 計算新舊角度的差值
        let delta = heading - prevRotation;

       
        while (delta > 180) delta -= 360;
        while (delta < -180) delta += 360;
        return prevRotation + delta;
      });
    };

    viewer.scene.postRender.addEventListener(updateCompass);
    return () => {
      viewer.scene.postRender.removeEventListener(updateCompass);
    };
  }, [viewer]);

  const resetNorth = () => {
    if (!viewer) return;
    const currentPosition = viewer.camera.position;
    const currentPitch = viewer.camera.pitch;

    viewer.camera.flyTo({
      destination: currentPosition,
      orientation: {
        heading: 0.0,
        pitch: currentPitch,
        roll: 0.0
      },
      duration: 1.0
    });
  };

  const styles = {
    container: {
      position: 'absolute',
      top: '70px',
      right: '40px',
      width: '150px',
      height: '150px',
      zIndex: 100,
      cursor: 'pointer',
      transform: `rotate(${compassRotation}deg)`, 
      transition: 'transform 0.1s linear', // 保持平滑動畫
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))',
      userSelect: 'none',
    }
  };

  return (
    <div 
      style={styles.container} 
      onClick={resetNorth}
      title="Return to true north"
    >
      <img 
        src={COMPASS_IMAGE_URL} 
        alt="Compass" 
        style={styles.image} 
        draggable="false"
      />
    </div>
  );
};

export default CesiumCompass;