import {React , useEffect, useState, useRef } from "react";
import "./logo-card.css";
import SacredGeometry from "../../../Common/SacredGeometry/SacredGeometry";

const LogoCard = () => {
    const boxRef = useRef(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);

  
    useEffect(() => {
      
      const boxElement = document.getElementsByClassName("logo_section-cont")[0]
      if (boxElement) {
        const boxWidth = boxElement.offsetWidth;
        const boxHeight = boxElement.offsetHeight;
        setWidth(boxWidth);
        setHeight(boxHeight);
        console.log(boxElement)
      }
    }, []);

  return (
    <section className="logo_section-cont">
      <div ref={boxRef} className="wraperAnim">
        <SacredGeometry boxWidth={width} boxHeaight={height} />
      </div>
     
      <div className="intro-card-cont">
        <div className="herocont">
          <h1 className="title">
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
   
      <a href="#intro-card" className="go-down-btn w-100" >
        <button className="material-symbols-outlined btn btn-outline-black  w-100  go-down-icon">
          keyboard_double_arrow_down
        </button>
      </a>
    </section>
  );
};

export default LogoCard;
