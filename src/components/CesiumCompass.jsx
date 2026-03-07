import React, { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import compassUrl from '../assets/compass.png';

const COMPASS_IMAGE_URL = compassUrl;

const CesiumCompass = ({ viewer }) => {
  const [compassRotation, setCompassRotation] = useState(0);

  useEffect(() => {
    if (!viewer) return;
// 角度環繞修正
    const updateCompass = () => {
      const heading = -Cesium.Math.toDegrees(viewer.camera.heading);

      setCompassRotation(prevRotation => {
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
      right: '20px',
      width: '110px',
      height: '110px',
      zIndex: 100,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    background: {
      position: 'absolute',
      width: '105px',
      height: '105px',
      borderRadius: '50%',
      backgroundColor: 'white',
      zIndex: 1,
    },
    imageWrapper: {
      position: 'absolute',
      width: '90px',
      height: '90px',
      zIndex: 2,
      cursor: 'pointer',
      transform: `rotate(${compassRotation}deg)`, 
      transition: 'transform 0.1s linear',
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
      <div style={styles.background}></div>
      <div style={styles.imageWrapper}>
        <img 
          src={COMPASS_IMAGE_URL} 
          alt="Compass" 
          style={styles.image} 
          draggable="false"
        />
      </div>
    </div>
  );
};

export default CesiumCompass;