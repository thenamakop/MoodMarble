import { createContext, ReactNode, useContext, useState } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";

const ChartWidthContext = createContext<number | null>(null);

interface ChartWidthProviderProps {
  children: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
}

/**
 * Measures the width of a chart card and provides it to descendant charts.
 *
 * Charts consume this width to size themselves to the available card width
 * instead of relying on a hardcoded desktop width.
 */
export function ChartWidthProvider({ children, onLayout, testID }: ChartWidthProviderProps) {
  const [width, setWidth] = useState<number | null>(null);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
    onLayout?.(event);
  }

  return (
    <ChartWidthContext.Provider value={width}>
      <View onLayout={handleLayout} style={{ width: "100%" }} testID={testID}>
        {children}
      </View>
    </ChartWidthContext.Provider>
  );
}

/**
 * Returns the measured width of the surrounding chart card, or a fallback width.
 */
export function useChartWidth(fallbackWidth: number): number {
  const measuredWidth = useContext(ChartWidthContext);
  return measuredWidth ?? fallbackWidth;
}
