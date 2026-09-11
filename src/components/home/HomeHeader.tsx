import React from "react";
import { Header, type HeaderProps } from "./Header";

export type HomeHeaderProps = HeaderProps;

/**
 * HomeHeader — Wrapper retrocompatível que renderiza o Header Slim-Balanced
 */
export function HomeHeader(props: HomeHeaderProps) {
  return <Header {...props} />;
}

export default HomeHeader;

