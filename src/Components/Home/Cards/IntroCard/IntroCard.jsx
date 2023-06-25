import React from "react";
import "./intro-card.css";
import EastIcon from "@mui/material/Icon/Icon";
import { Button } from "@mui/material";

import gemo from "../../../../assets/img/IALOGOS/20.jpg";

let intro = {
  capitalFirstLetter: "S",
  text: "olamente hay una pequeña parte del Universo que sabrás con certeza que puede ser mejorada… Y esa parte eres tu",
  quienSoy: " Soy Humano Despierto Hace muchos años, casi desde que tengo memoria en realidad, comencé una búsqueda de los “por qué” a infinidad de preguntas que surgían en mi. Así comenzó un enamoramiento con el Universo y sus misterios.",
};

const IntroCard = () => {
  return (
    <section id="intro-card" className="intro_card-cont d-flex">
      <article className="row mx-auto d-flex text-img-box">
        <div className="text-cont  m-auto intro col-lg">
          <h2 className="m-auto">
            <strong>{intro.capitalFirstLetter}</strong>{intro.text}
          </h2>
        </div>
        <div className="intro_img-cont col-xs">
          <img className="intro_img-intro" src={gemo} alt="gemo" />
        </div>
      </article>
      {/* <a className="conoceme-btnc" href="/sobre-mi">
          <Button
            endIcon={<EastIcon />}
            variant="outlined"
            className="conoceme-btn "
          >
            Conoceme!
          <i className="material-icons p-3">arrow_forward</i>
          </Button>
        </a> */}

      <article className="text-center row">
        <p className="quien-soy-text px-3">
         {intro.quienSoy}
        </p>
      </article>
    </section>
  );
};

export default IntroCard;
