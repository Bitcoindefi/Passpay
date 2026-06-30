import { Composition } from "remotion";
import { Slides } from "./Slides";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Slides"
      component={Slides}
      durationInFrames={420}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
