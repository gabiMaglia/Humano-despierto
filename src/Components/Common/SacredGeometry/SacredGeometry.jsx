import React from "react";
import { Stage, Layer } from "react-konva";
import { Box } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { centerOfScreen } from "./Utils";
import SeedOfLife from "./shapes/SeedOfLife";
import FlowerOfLife from "./shapes/FlowerOfLife";

import spaceImage from "../../../assets/img/space.jpg";

// FONDO Y OSCURECIDO

const useStyles = makeStyles((theme) => ({
  // FONDO
  root: {
    zIndex: -1,
    position: "absolute",
    width: "100%",
    height: '100%',
    top: 0,
    left: 0,
    backgroundImage: `url(${spaceImage})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    "&:before": {
      // OSCURECIDO
      content: '""',
      position: "absolute",
      width: "100%",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: "rgba(0, 0, 0, 0.92)",
    },
  },
}));

const SacredGeometry = (props) => {
  const classes = useStyles();
  const {boxWidth, boxHeaight} = props
  
  const centralCoordinates = centerOfScreen(boxWidth, boxHeaight );
  let shape2 = (
    <Stage width={boxWidth} height={boxHeaight}>
      <Layer>
        <SeedOfLife center={centralCoordinates} />
      </Layer>
    </Stage>
  );

  let shape = (
    <Stage width={boxWidth} height={boxHeaight}>
      <FlowerOfLife center={centralCoordinates} />
    </Stage>
  
  );

  return <Box className={classes.root}>{shape}</Box>;
};

export default SacredGeometry;
