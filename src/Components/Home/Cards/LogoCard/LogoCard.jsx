import React from "react";
import "./logo-card.css";
import SacredGeometry from "../../../Common/SacredGeometry/SacredGeometry";

const LogoCard = () => {
  return (
    <section className="section-cont">
      <SacredGeometry />
      <div className="blancSpace"></div>
      <div className="intro-card-cont">
        <div className="herocont">
          <h1 className="title pb-5">
            <strong className="t-stroke">Humano</strong>
            <strong className="t-stroke ">Despierto</strong>
          </h1>
        </div>
      </div>
      <p className="frase">
        <em> Tu misión es comprender, tu propósito ser feliz!!.</em>
        <br />

        <strong> No te distraigas</strong>
      </p>

      <a href="#intro-card-cont row">
        <button className="material-symbols-outlined btn btn-outline-black  w-100 go-down-icon">
          keyboard_double_arrow_down
        </button>
      </a>
    </section>
  );
};

export default LogoCard;
