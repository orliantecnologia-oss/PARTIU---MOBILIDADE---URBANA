import React from "react";
import { Header, type HeaderProps } from "./Header";

export interface AnimatedWaveHeaderProps extends HeaderProps {
  waveRadius?: number;
  isScrolled?: boolean;
}

/**
 * AnimatedWaveHeader — Wrapper com suporte retrocompatível que renderiza o Header Slim-Balanced
 */
export function AnimatedWaveHeader(props: AnimatedWaveHeaderProps) {
  return <Header {...props} />;
}

export { AnimatedWaveHeader as FloatingIslandHeader };
export default AnimatedWaveHeader;

