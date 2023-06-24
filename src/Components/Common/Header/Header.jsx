import React from "react";
import "./header.css";
const Header = (props) => {
  const {title, style} = props



  return (
    <header id="header" className="header-cursos">
      <h1 className="text-white">{title}</h1>
    </header>
  );
};

export default Header;
