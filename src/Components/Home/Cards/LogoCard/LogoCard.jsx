import React from "react";
import "./logo-card.css";

const LogoCard = () => {
  return (
    <section className="intro-card-cont">
      <div className="herocont">
        <h1 className="title">
          <strong className="t-stroke t-shadow">Humano</strong>
          <strong className="t-stroke t-shadow">Despierto</strong>
        </h1>
      </div>
      <p className="frase">
        Tu misión es comprender, tu propósito, ser feliz.
        <em> No te distraigas!</em>
      </p>
    </section>
  );
};

export default LogoCard;
