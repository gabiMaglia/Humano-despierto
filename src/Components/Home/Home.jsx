import React from "react";
import "./home.css";
import LogoCard from "./Cards/LogoCard/LogoCard";
import IntroCard from "./Cards/Card/IntroCard";

const Home = () => {
  return (
    <main>
      <LogoCard />
      <IntroCard />
    </main>
  );
};

export default Home;
