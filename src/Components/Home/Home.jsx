import React from "react";
import LogoCard from "./Cards/LogoCard/LogoCard";
import IntroCard from "./Cards/IntroCard/IntroCard";

import "./home.css";
import CursosCard from "./Cards/CursosCard/CursosCard";

const Home = () => {
  return (
    <>
      <main className="home">
        <LogoCard />
        <IntroCard />
        {/* <CursosCard /> */}
      </main>
    </>
  );
};

export default Home;
