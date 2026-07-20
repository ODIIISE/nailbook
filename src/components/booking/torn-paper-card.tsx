"use client";

import type { ReactNode } from "react";

interface TornPaperCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Torn paper card: SVG torn edges top & bottom, perforation dots, paper texture.
 * Inspired by Variant 9 from the creative receipt mockups.
 */
export function TornPaperCard({ children, className = "" }: TornPaperCardProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        filter: "drop-shadow(0 4px 12px rgba(80,70,60,0.08)) drop-shadow(0 8px 24px rgba(60,50,40,0.06))",
      }}
    >
      <div
        className="relative"
        style={{
          background: "var(--card)",
          borderRadius: "4px",
          transform: "rotate(-0.3deg)",
          overflow: "visible",
        }}
      >
        {/* Torn top edge */}
        <svg
          className="block absolute top-[-3px] left-0 right-0 z-[5]"
          width="100%"
          height="8"
          viewBox="0 0 400 8"
          preserveAspectRatio="none"
        >
          <path
            d="M0,8 L0,3 Q5,0 10,4 Q15,7 20,2 Q25,0 30,5 Q35,8 40,3 Q45,0 50,4 Q55,7 60,2 Q65,0 70,5 Q75,8 80,3 Q85,0 90,4 Q95,7 100,2 Q105,0 110,5 Q115,8 120,3 Q125,0 130,4 Q135,7 140,2 Q145,0 150,5 Q155,8 160,3 Q165,0 170,4 Q175,7 180,2 Q185,0 190,5 Q195,8 200,3 Q205,0 210,4 Q215,7 220,2 Q225,0 230,5 Q235,8 240,3 Q245,0 250,4 Q255,7 260,2 Q265,0 270,5 Q275,8 280,3 Q285,0 290,4 Q295,7 300,2 Q305,0 310,5 Q315,8 320,3 Q325,0 330,4 Q335,7 340,2 Q345,0 350,5 Q355,8 360,3 Q365,0 370,4 Q375,7 380,2 Q385,0 390,5 Q395,8 400,3 L400,8 Z"
            fill="var(--card)"
          />
        </svg>

        {/* Content area */}
        <div className="relative z-[2]">
          {children}
        </div>

        {/* Torn bottom edge */}
        <svg
          className="block absolute bottom-[-3px] left-0 right-0 z-[5]"
          width="100%"
          height="8"
          viewBox="0 0 400 8"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 L0,5 Q5,8 10,4 Q15,1 20,6 Q25,8 30,3 Q35,0 40,5 Q45,8 50,4 Q55,1 60,6 Q65,8 70,3 Q75,0 80,5 Q85,8 90,4 Q95,1 100,6 Q105,8 110,3 Q115,0 120,5 Q125,8 130,4 Q135,1 140,6 Q145,8 150,3 Q155,0 160,5 Q165,8 170,4 Q175,1 180,6 Q185,8 190,3 Q195,0 200,5 Q205,8 210,4 Q215,1 220,6 Q225,8 230,3 Q235,0 240,5 Q245,8 250,4 Q255,1 260,6 Q265,8 270,3 Q275,0 280,5 Q285,8 290,4 Q295,1 300,6 Q305,8 310,3 Q315,0 320,5 Q325,8 330,4 Q335,1 340,6 Q345,8 350,3 Q355,0 360,5 Q365,8 370,4 Q375,1 380,6 Q385,8 390,3 Q395,0 400,5 L400,0 Z"
            fill="var(--card)"
          />
        </svg>
      </div>
    </div>
  );
}
