import { Fragment } from "react";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import type { ManagerDashboardViewModel } from "@/features/dashboard/chart-model";

interface WeeklyTrendChartProps {
  data: ManagerDashboardViewModel["weeklyTrend"]["data"];
  width: number;
}

const CHART_HEIGHT = 200;
const PADDING = { top: 20, right: 16, bottom: 32, left: 28 };
const Y_MIN = 0;
const Y_MAX = 10;
const Y_TICKS = [0, 2, 4, 6, 8, 10];
const AXIS_COLOR = "#6b7280";
const GRID_COLOR = "#e5e7eb";
const LINE_COLOR = "#4f46e5";

export function WeeklyTrendChart({ data, width }: WeeklyTrendChartProps) {
  const plotWidth = Math.max(1, width - PADDING.left - PADDING.right);
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const xForIndex = (index: number) =>
    PADDING.left + (data.length > 1 ? (plotWidth * index) / (data.length - 1) : plotWidth / 2);

  const yForValue = (value: number) =>
    PADDING.top + plotHeight - (plotHeight * (value - Y_MIN)) / (Y_MAX - Y_MIN);

  // Break the line into separate segments at privacy-hidden (null) points,
  // so the chart shows a real gap instead of a dip to zero or a fabricated
  // connection across missing data.
  const segments: { x: number; y: number }[][] = [];
  let currentSegment: { x: number; y: number }[] = [];
  data.forEach((point, index) => {
    if (point.scoreValue === null) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      return;
    }
    currentSegment.push({ x: xForIndex(index), y: yForValue(point.scoreValue) });
  });
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return (
    <Svg height={CHART_HEIGHT} testID="manager-dashboard-weekly-svg" width={width}>
      {Y_TICKS.map((tick) => {
        const y = yForValue(tick);
        return (
          <Fragment key={tick}>
            <Line
              stroke={GRID_COLOR}
              strokeOpacity={0.6}
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={y}
              y2={y}
            />
            <SvgText
              fill={AXIS_COLOR}
              fontSize={10}
              textAnchor="end"
              x={PADDING.left - 8}
              y={y + 4}
            >
              {tick}
            </SvgText>
          </Fragment>
        );
      })}

      {data.map((point, index) => (
        <SvgText
          key={point.date}
          fill={AXIS_COLOR}
          fontSize={10}
          textAnchor="middle"
          x={xForIndex(index)}
          y={CHART_HEIGHT - 12}
        >
          {point.label}
        </SvgText>
      ))}

      {segments.map((segment, segmentIndex) => (
        <Polyline
          key={segmentIndex}
          fill="none"
          points={segment.map((point) => `${point.x},${point.y}`).join(" ")}
          stroke={LINE_COLOR}
          strokeWidth={3}
        />
      ))}

      {data.map((point) =>
        point.scoreValue === null ? null : (
          <Circle
            key={point.date}
            cx={xForIndex(data.indexOf(point))}
            cy={yForValue(point.scoreValue)}
            fill={LINE_COLOR}
            r={4}
          />
        ),
      )}

      {data.map((point, index) =>
        point.scoreValue === null ? null : (
          <SvgText
            key={`${point.date}-label`}
            fill={AXIS_COLOR}
            fontSize={11}
            fontWeight="600"
            testID={`manager-dashboard-weekly-label-${point.date}`}
            textAnchor="middle"
            x={xForIndex(index)}
            y={yForValue(point.scoreValue) - 12}
          >
            {point.scoreLabel}
          </SvgText>
        ),
      )}
    </Svg>
  );
}
