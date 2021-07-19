import Header from './../components/header';
import styles from '../styles/Home.module.css';
import Particles from 'react-particles-js';
import Link from 'next/link'


export default function Home() {
  return (
    <>
        <div className={styles.container}>
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
          <div className={styles.page}>
            <Header />
            <div className={styles.main}>
              <Link href="/connect">
                <a>Start ZenGreeting</a>
              </Link>
              <div className={styles.homeText}>

              </div>
            </div>

          </div>
        </div>
    </>
  )
}
