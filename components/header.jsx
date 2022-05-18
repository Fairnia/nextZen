import React from 'react'
import Image from 'next/image'

export default function Header() {
    return (
        <header>
            <div className="logo">
                <Image className="logoImg" src="/img/logo.svg" alt="Zengreet Logo" />
            </div>
            <h1>ZenGreet</h1>
            <style jsx>{`
               color: #fff;
               font-size: 50px;
               font-weight: 200;
               margin: 0;
               padding: 0;
               h1{
                   margin-right: 15px;
               }
               .logo{
                   height: 75px;
                   width: 75px;
                   display: flex;
                   justify-content: center;
                   align-items: center;

               }
               .logoImg {
                    width: 150%;
                    height: 150%;
                    transform: scaleX(-1);
              }
                @media (max-width: 600px) {
                    div {
                        font-size: 1.4em;
                    }
                }
            `}</style>
        </header>
    )
}
