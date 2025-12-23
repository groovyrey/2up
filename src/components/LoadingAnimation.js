"use client";

import Lottie from "lottie-react";
import animationData from "./loading-animation.json";

export default function LoadingAnimation() {
  return (
    <div style={{ width: 200, height: 200 }}>
      <Lottie animationData={animationData} loop={true} />
    </div>
  );
}
