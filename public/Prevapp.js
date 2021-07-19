import Slider from "react-slick";
import Particles from 'react-particles-js';
import logo from './assets/4.svg'
import './App.css';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

function App() {
  var settings = { 
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true
  };
  return (
  <>
    <div className="App">
        <Particles
          params={{
            "particles": {
              "number": {
                "value": 70,
                "density": {
                  "enable": true,
                  "value_area": 800
                }
              },
              "color": {
                "value": "#ffffff",
                "opacity": 1 
              },
              "move": {
                "random": true,
                "speed": 1,
                "direction": "random",
            },
            "size": {
              "value": 3,
              "random": true,
              "anim": {
                  "speed": 3,
                  "size_min": 0.3
              }
            },
          },
        }
        }
        />
        <div className="page">
          <header>
            <div class="logo">
              <img src={logo} />
            </div>         
            <a href="www.google.com">

            ZenGreet
            </a>
          </header>

        
          <div className="slideContainer">
          <Slider {...settings}>
            <div className="homeSlide">
              <h3>What</h3>
              <div className="insideSlider"></div>
            </div>
            <div className="homeSlide">
              <h3>How</h3>
              <div className="insideSlider"></div>
            </div>
            <div className="homeSlide">
              <h3>Why</h3>
            <div className="insideSlider"></div>
            </div>  
          </Slider>
          </div>
          <div className="chat-btn">Start ZenGreeting</div>



        </div>

    </div>
    </>
  );
}

export default App;
