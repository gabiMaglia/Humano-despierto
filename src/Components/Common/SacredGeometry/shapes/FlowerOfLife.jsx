import React, { useEffect, createRef } from "react";
import Konva from "konva";
import { Layer, Circle } from "react-konva";

import { pointOnCircle, perfectShapeWidth, degreesToRadians } from "../Utils";

import SeedOfLife from "./SeedOfLife";

const FlowerOfLife = ({ center }) => {
  // TamaNoDeLaAnimacion
  const radiusOfCircle = perfectShapeWidth(5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seedOfLifeRefs = []; // array of refs to reference them
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seedOfLifesDrawn = [];
  const scaffoldingColour = "Purple";

  useEffect(() => {
    seedOfLifeRefs.forEach((seedOfLifeRef, i) => {
      seedOfLifesDrawn[i] = false;
      seedOfLifeRef.current.to({
        onFinish: () => {
          seedOfLifesDrawn[i] = true;
          const allDone = seedOfLifesDrawn.reduce((acc, curr) => acc && curr);
          if (allDone) {
          }
        },
        opacity: 0.19,
        duration: i * Math.random() + i, // make the seeds of life come in at different times
        easing: Konva.Easings.StrongEaseInOut, // https://konvajs.org/api/Konva.Easings.html
      });
    });
  }, [seedOfLifeRefs, seedOfLifesDrawn]);

  let shape = 2;

  const seedsOfLife = [
    <SeedOfLife
      key={shape}
      center={center}
      radiusOfCircle={radiusOfCircle}
      ref={(seedOfLifeRefs[shape] = createRef())}
      opacity={0.3}
    />,
  ];
  // Forma
  seedsOfLife.push(
    [0, 60, 120, 180, 240, 300].map((angle) => {
      const coordsOnSeedOfLife = pointOnCircle(
        radiusOfCircle,
        degreesToRadians(angle),
        center
      );
      shape++;
      return (
        <SeedOfLife
          key={shape}
          center={coordsOnSeedOfLife}
          radiusOfCircle={radiusOfCircle}
          ref={(seedOfLifeRefs[shape] = createRef())}
          opacity={0}
        />
      );
    })
  );

  seedsOfLife.push(
    [3, 3.17].map((circleSize) => {
      shape++;
      return (
        <Circle
          key={shape}
          radius={radiusOfCircle * circleSize}
          stroke={scaffoldingColour}
          opacity={0}
          ref={(seedOfLifeRefs[shape] = createRef())}
          strokeWidth={3}
          x={center.x}
          y={center.y}
          shadowColor={"lightblue"}
          shadowBlur={120}
          shadowOffset={{ x: 1, y: 1 }}
          shadowOpacity={0.8}
        />
      );
    })
  );

  return <Layer>{seedsOfLife}</Layer>;
};

export default FlowerOfLife;
