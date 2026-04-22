import "../styles/Navbar.css";
import "../styles/Hero.css";
import "../styles/Features.css";
import "../styles/MapSection.css";
import "../styles/Stats.css";
import "../styles/About.css";
import "../styles/Footer.css";
import "../App.css";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Stats from "../components/Stats";
import About from "../components/About";
import Features from "../components/Features";
import MapSection from "../components/MapSection";
import Footer from "../components/Footer";

function Home() {

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);

    if (element) {
      const yOffset = -80;
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="app">

      <Navbar scrollToSection={scrollToSection} />

      <section id="beranda">
        <Hero />
      </section>

      <section id="statistik">
        <Stats />
      </section>

      <section id="tentang">
        <About />
      </section>

      <section id="fitur">
        <Features />
      </section>

      <section id="peta">
        <MapSection />
      </section>

      <Footer />

    </div>
  );
}

export default Home;