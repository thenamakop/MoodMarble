import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { WeekPicker } from "@/features/dashboard/week-picker";

const OriginalDate = global.Date;

function mockDate(isoDate: string) {
  global.Date = class extends OriginalDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(isoDate);
      } else {
        super(...(args as [string | number | Date]));
      }
    }

    static now() {
      return new OriginalDate(isoDate).getTime();
    }
  } as typeof Date;
}

describe("WeekPicker", () => {
  const selectedWeekStart = "2026-06-15";
  const onSelectWeek = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDate("2026-06-18T12:00:00.000Z");
  });

  afterEach(() => {
    global.Date = OriginalDate;
  });

  it("highlights the selected week row", async () => {
    const view = await render(
      <WeekPicker
        onClose={onClose}
        onSelectWeek={onSelectWeek}
        selectedWeekStart={selectedWeekStart}
        visible
      />,
    );

    await waitFor(() => expect(view.getByTestId("week-picker-row-2026-06-15")).toBeTruthy());
  });

  it("selects the row's Monday when any day in the row is pressed", async () => {
    const view = await render(
      <WeekPicker
        onClose={onClose}
        onSelectWeek={onSelectWeek}
        selectedWeekStart={selectedWeekStart}
        visible
      />,
    );

    await waitFor(() => expect(view.getByTestId("week-picker-row-2026-06-15")).toBeTruthy());

    fireEvent.press(view.getByTestId("week-picker-row-2026-06-15"));

    expect(onSelectWeek).toHaveBeenCalledWith("2026-06-15");
    expect(onClose).toHaveBeenCalled();
  });

  it("does not select or close when a future week row is pressed", async () => {
    const view = await render(
      <WeekPicker
        onClose={onClose}
        onSelectWeek={onSelectWeek}
        selectedWeekStart={selectedWeekStart}
        visible
      />,
    );

    // June 2026: the week starting 2026-06-22 is after today (2026-06-18).
    await waitFor(() => expect(view.getByTestId("week-picker-row-2026-06-22")).toBeTruthy());

    fireEvent.press(view.getByTestId("week-picker-row-2026-06-22"));

    expect(onSelectWeek).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when the backdrop is pressed", async () => {
    const view = await render(
      <WeekPicker
        onClose={onClose}
        onSelectWeek={onSelectWeek}
        selectedWeekStart={selectedWeekStart}
        visible
      />,
    );

    await waitFor(() => expect(view.getByTestId("week-picker-backdrop")).toBeTruthy());

    fireEvent.press(view.getByTestId("week-picker-backdrop"));

    expect(onClose).toHaveBeenCalled();
  });
});
