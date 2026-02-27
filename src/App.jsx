import ThreeScene from "./component/ThreeScene";
import { BackgroundAudio } from "./component/BackgroundAudio";

function App() {


  return (
    <>
     <BackgroundAudio src="/ost.mp3" volume={0.2} loop={true} />
    <ThreeScene/>
    </>
  )
}

export default App
