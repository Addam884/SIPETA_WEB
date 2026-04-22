import Lottie from "lottie-react";
import virusAnimation from "../assets/virus.json";

function Hero() {

  return (
    <section className="hero">

      <div className="hero-bg-grid"></div>
      <div className="hero-orb hero-orb-1"></div>
      <div className="hero-orb hero-orb-2"></div>

      <div className="hero-container">

        <div className="hero-left">

          <h1 className="hero-title">
            Sistem Informasi
            <span className="hero-accent"> Pemetaan Penyakit </span>
            Kabupaten Jember
          </h1>

          <p className="hero-desc">
            Platform berbasis GIS untuk memantau penyebaran penyakit 
            dan mendukung pengambilan keputusan kesehatan masyarakat yang lebih cepat dan tepat.
          </p>

          <div className="hero-actions">
            <button className="btn-primary">
              Lihat Peta Penyakit
            </button>

            <button className="btn-secondary">
              Pelajari Lebih Lanjut
            </button>
          </div>

        </div>

        {/* LOTTIE VIRUS */}
        <div className="hero-right">

          <Lottie
            animationData={virusAnimation}
            loop={true}
            className="virus-lottie"
          />

        </div>

      </div>

    </section>
  );
}

export default Hero;