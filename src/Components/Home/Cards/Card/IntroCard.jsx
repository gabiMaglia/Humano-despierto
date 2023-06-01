import React from "react";
import "./intro-card.css";

import brujas from "../../../../assets/Terapias/brujas.webp";
import emociones from "../../../../assets/Terapias/emociones.webp";
import energia from "../../../../assets/Terapias/energia.webp";
import numerologia from "../../../../assets/Terapias/numerologia.webp";
import registros from "../../../../assets/Terapias/registros.webp";
import tarot from "../../../../assets/Terapias/tarot.webp";

import gemo from "../../../../assets/img/gemoterapia.jpg";

const IntroCard = () => {
  return (
    <section id="intro-card-cont">
      <div className="cont">
        <article className="row">
          <div className="text-cont intro col">
            <h2>
              Solamente hay una pequeña parte del Universo que sabrás con
              certeza que puede ser mejorada… Y esa parte eres tu
            </h2>
          </div>
          <div className="img-cont">
            <img className="img-intro" src={gemo} alt="gemo" />
          </div>
          <button>Conoceme!</button>
        </article>
        <article className="row">
          <p>
            <strong>Soy Humano Despierto</strong> Hace muchos años, casi desde
            que tengo memoria en realidad, comencé una búsqueda de los “por qué”
            a infinidad de preguntas que surgían en mi. Así comenzó un
            enamoramiento con el Universo y sus misterios.
          </p>
        </article>
        <article>
          <div className="text-cont charlas col ">
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
              <button>Conocer Mas</button>
            </div>
            <div className="curso-card">
              <img src={registros} alt="Registros Akashicos" />
              <p>Registros Akashicos</p>
              <button>Conocer Mas</button>
            </div>
            <div className="curso-card">
              <img
                src={emociones}
                alt="Desbloqueo Emocional y Sanación Vincular"
              />
              <p>Desbloqueo Emocional y Sanación Vincular</p>
              <button>Conocer Mas</button>
            </div>
            <div className="curso-card">
              <img src={tarot} alt="tarot" />
              <p>Tarot</p>
              <button>Conocer Mas</button>
            </div>
            <div className="curso-card">
              <img src={numerologia} alt="numerologia" />
              <p>Numerologia</p>
              <button>Conocer Mas</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};

export default IntroCard;
