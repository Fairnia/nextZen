import '../styles/globals.css'
import AppHead from './../components/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <AppHead />
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
