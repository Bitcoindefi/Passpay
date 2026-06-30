import { Composition } from "remotion";
import { Pitch } from "./Slides";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Pitch"
      component={Pitch}
      durationInFrames={3095}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
