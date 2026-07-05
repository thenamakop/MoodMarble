import { createContext, ReactNode, useContext, useRef, useState } from "react";
import { Dimensions, type LayoutChangeEvent, View } from "react-native";

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
 *
 * The measuring View clips its own content (overflow: "hidden") so that if
 * a chart briefly renders wider than its true measured width during a
 * layout transition, the excess is clipped rather than bleeding into
 * neighbouring cards.
 */
export function ChartWidthProvider({ children, onLayout, testID }: ChartWidthProviderProps) {
  const [width, setWidth] = useState<number | null>(null);
  const lastWidthRef = useRef<number | null>(null);

  function handleLayout(event: LayoutChangeEvent) {
    const measured = Math.round(event.nativeEvent.layout.width);

    // Skip the state update if the new measurement is within 1px of the
    // last one. Android's Yoga layout engine can report sub-pixel-different
    // widths across consecutive layout passes for the same visual box —
    // without this guard, every one of those near-identical measurements
    // triggers a full VictoryChart re-render, which is visible as flicker.
    if (lastWidthRef.current !== null && Math.abs(lastWidthRef.current - measured) < 1) {
      onLayout?.(event);
      return;
    }

    lastWidthRef.current = measured;
    setWidth(measured);
    onLayout?.(event);
  }

  return (
    <ChartWidthContext.Provider value={width}>
      <View onLayout={handleLayout} style={{ width: "100%", overflow: "hidden" }} testID={testID}>
        {children}
      </View>
    </ChartWidthContext.Provider>
  );
}

/**
 * Returns the measured width of the surrounding chart card, or a fallback
 * derived from the device's window width. Using the actual window width
 * (minus estimated card padding) as the fallback — instead of a fixed
 * guessed constant — means the very first paint, before any layout event
 * has fired, is already close to the true card width. This avoids the
 * visible jump/resize that happens when the fallback and the real
 * measured width differ significantly.
 */
export function useChartWidth(fallbackWidth: number): number {
  const measuredWidth = useContext(ChartWidthContext);
  if (measuredWidth !== null) {
    return measuredWidth;
  }

  const windowWidth = Dimensions.get("window").width;
  // Estimate card padding: the card has Spacing.four padding on each side
  // (see styles.card in dashboard-charts.tsx) plus the outer screen gutter.
  // If windowWidth cannot be read for any reason, fall back to the
  // caller-provided fallbackWidth exactly as before.
  if (!windowWidth || Number.isNaN(windowWidth)) {
    return fallbackWidth;
  }

  const estimatedCardWidth = Math.round(windowWidth - 64);
  return estimatedCardWidth > 0 ? estimatedCardWidth : fallbackWidth;
}
