import React from "react";
import "./logo-card.css";
import logo from "../../../../assets/logo_aplha.gif";
const LogoCard = () => {
  return (
    <section className="card-cont">
      <div className="herocont">
        <div className="imgCont">
          <img className="logo-pic" src={logo} alt="Humano Despierto" />
        </div>
        <h1 className="title">
          <strong>Humano</strong>
          <strong>Despierto</strong>
        </h1>
      </div>
      <p className="frase">
        Tu misión es comprender, tu propósito ser feliz.{" "}
        <em>No te distraigas!</em>
      </p>
    </section>
  );
};

export default LogoCard;
