import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Hero from "./Hero";
import Features from "./Features";
import Stats from "./Stats";
import Testimonials from "./Testimonials";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <Testimonials />
      <Footer />
    </div>
  );
}
