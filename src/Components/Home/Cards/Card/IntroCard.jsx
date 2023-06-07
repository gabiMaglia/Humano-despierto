import React from "react";
import "./intro-card.css";

import brujas from "../../../../assets/Terapias/brujas.webp";
import emociones from "../../../../assets/Terapias/emociones.webp";

import numerologia from "../../../../assets/Terapias/numerologia.webp";
import registros from "../../../../assets/Terapias/registros.webp";
import tarot from "../../../../assets/Terapias/tarot.webp";

import gemo from "../../../../assets/img/IALOGOS/20.jpg";
import { Button } from "@mui/material";

const IntroCard = () => {
  return (
    <section id="intro-card-cont">
      <div className="cont">
        <article className="row">
          <div className="text-cont intro col m-auto">
            <h2>
              <strong>S</strong>olamente hay una pequeña parte del Universo que
              sabrás con certeza que puede ser mejorada… Y esa parte eres tu
            </h2>
          </div>
          <div className="img-cont">
            <img className="img-intro" src={gemo} alt="gemo" />
          </div>
          <p className="quien-soy-text mt-3">
            Soy Humano Despierto Hace muchos años, casi desde que tengo memoria
            en realidad, comencé una búsqueda de los “por qué” a infinidad de
            preguntas que surgían en mi. Así comenzó un enamoramiento con el
            Universo y sus misterios.
          </p>
          <a className="w-100" href="/#">
            <Button variant="inherit" className="conoceme-btn mt-5">
              Conoceme!
            </Button>
          </a>
        </article>
        <article className="row"></article>
        <article id="charlas-cursos-cont">
          <div className="text-cont charlas ">
            <h2>Charlas, Talleres y Cursos</h2>
            <p>
              Tendrás videos de cada clase, material de lectura obligatoria y
              material de lectura opcional para bajar.
            </p>
          </div>

          <div className="cursos-cont">
            <div className="curso-card">
              <img src={brujas} alt="Tarot y Numerología" />
              <p>Tarot y Numerología</p>
              <Button className="" variant="inherit">
                Conocer Mas
              </Button>
            </div>
            <div className="curso-card">
              <img src={registros} alt="Registros Akashicos" />
              <p>Registros Akashicos</p>
              <Button variant="inherit">Conocer Mas</Button>
            </div>
            <div className="curso-card">
              <img
                src={emociones}
                alt="Desbloqueo Emocional y Sanación Vincular"
              />
              <p>Desbloqueo Emocional y Sanación Vincular</p>
              <Button variant="inherit">Conocer Mas</Button>
            </div>
            <div className="curso-card">
              <img src={tarot} alt="tarot" />
              <p>Tarot</p>
              <Button variant="inherit">Conocer Mas</Button>
            </div>
            <div className="curso-card">
              <img src={numerologia} alt="numerologia" />
              <p>Numerologia</p>
              <Button variant="inherit">Conocer Mas</Button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};

export default IntroCard;
