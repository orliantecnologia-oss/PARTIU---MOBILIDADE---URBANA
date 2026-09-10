/**
 * ==============================================================================
 * 📍 PARTIU — 99 BLUE DOT (MARCADOR DE LOCALIZAÇÃO DO USUÁRIO)
 * ==============================================================================
 * Marcador de localização estilo 99 App: ponto azul sólido (#00A3E0) com halo
 * azul claro translúcido. Design limpo sem animações pesadas para preservar
 * bateria e manter a tela minimalista.
 *
 * Utilizado como filho do <MapboxGL.UserLocation> para ancoragem automática
 * na coordenada de GPS em tempo real.
 * ==============================================================================
 */

import React from "react";
import { StyleSheet, View } from "react-native";

export interface PulsingUserDotProps {
  /** Cor do halo externo (default: azul 99 translúcido) */
  haloColor?: string;
  /** Cor do ponto central sólido (default: azul institucional 99 #00A3E0) */
  dotColor?: string;
  /** Diâmetro do ponto central em pixels (default: 16) */
  size?: number;
}

export function PulsingUserDot({
  haloColor = "rgba(0, 163, 224, 0.2)",
  dotColor = "#00A3E0",
  size = 16,
}: PulsingUserDotProps) {
  const haloSize = size * 2.25; // Halo ~36px para dot de 16px

  return (
    <View style={styles.container}>
      {/* 1. Halo Azul Claro Translúcido (99 Light Blue Glow) */}
      <View
        style={[
          styles.halo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: haloColor,
          },
        ]}
      />

      {/* 2. Ponto Central Sólido Azul 99 com Borda Branca */}
      <View
        style={[
          styles.centerDot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: dotColor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
  },
  halo: {
    position: "absolute",
    zIndex: 1,
  },
  centerDot: {
    position: "relative",
    zIndex: 2,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    // Sombra ultra-suave contra o asfalto do mapa (shadow-sm / elevation-2)
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});