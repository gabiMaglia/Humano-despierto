import React from "react";
import "./logo-card.css";
import SacredGeometry from "../../../Common/SacredGeometry/SacredGeometry";

const LogoCard = () => {
  return (
    <section className="section-cont">
      <SacredGeometry />
      <div className="intro-card-cont">
        <div className="herocont">
          <h1 className="title pb-5">
            <strong className="t-stroke t-shadow">Humano</strong>
            <strong className="t-stroke t-shadow">Despierto</strong>
          </h1>
        </div>
      </div>
      <p className="frase">
        Tu misión es comprender, tu propósito, ser feliz.
        <em> No te distraigas!</em>
      </p>

      <a href="#intro-card-cont">
        <button className="material-symbols-outlined btn btn-outline-black  position-absolute w-100 go-down-icon">
          keyboard_double_arrow_down
        </button>
      </a>
    </section>
  );
};

export default LogoCard;
