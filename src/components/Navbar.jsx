import { useEffect, useState } from "react";

function Navbar() {

  const [time, setTime] = useState("");

  useEffect(() => {

    const timer = setInterval(() => {

      const now = new Date();

      setTime(
        now.toLocaleTimeString()
      );

    },1000);

    return ()=>clearInterval(timer);

  },[]);

  return (

    <nav className="navbar">

      <div className="logo">
        🧠 BrainOS
      </div>

      <div className="nav-right">

        <div className="status">

          ● AI ONLINE

        </div>

        <div id="clock">

          {time}

        </div>

      </div>

    </nav>

  );

}

export default Navbar;